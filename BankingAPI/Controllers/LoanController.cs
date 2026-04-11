// Controllers/LoanController.cs
using BankingAPI.Data;
using BankingAPI.DTOs;
using BankingAPI.Helpers;
using BankingAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BankingAPI.Controllers
{
    [ApiController]
    [Microsoft.AspNetCore.Mvc.Route("api/[controller]")]
    [Authorize]
    public class LoanController : ControllerBase
    {
        private readonly BankingContext _db;
        public LoanController(BankingContext db) { _db = db; }

        // ── GET loan types ─────────────────────────────────────
        [HttpGet("types")]
        public IActionResult GetTypes() => Ok(new[]
        {
            new { type="Personal Loan", icon="👤", rate=14.5, desc="Personal needs, education, medical", min=10000,  max=500000,   minM=6,  maxM=60  },
            new { type="Home Loan",     icon="🏠", rate=8.5,  desc="Buying or building a home",          min=500000, max=10000000, minM=60, maxM=360 },
            new { type="Vehicle Loan",  icon="🚗", rate=10.5, desc="Car, motorcycle, or vehicle",        min=50000,  max=3000000,  minM=12, maxM=84  },
            new { type="Business Loan", icon="💼", rate=12.0, desc="Business expansion or capital",      min=100000, max=5000000,  minM=12, maxM=120 },
        });

        // ── GET all loans — FIXED ──────────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var list = await _db.Loans
                    .Include(l => l.Customer)
                    .Include(l => l.EmiPayments)
                    .OrderByDescending(l => l.CreatedAt)
                    .ToListAsync();

                var result = list.Select(l => new {
                    l.LoanId,
                    l.LoanNo,
                    l.LoanType,
                    l.Amount,
                    l.Months,
                    l.InterestRate,
                    l.TotalInterest,
                    l.TotalPayable,
                    l.MonthlyPayment,
                    l.Status,
                    l.Progress,
                    l.RejectedReason,
                    l.CreatedAt,
                    CustomerName = l.Customer != null ? l.Customer.FullName : "Unknown",
                    CustomerNo = l.Customer != null ? l.Customer.CustomerNo : "Unknown",
                    CustomerId = l.Customer != null ? l.Customer.CustomerId : 0,
                    TotalPaid = l.EmiPayments != null ? l.EmiPayments.Sum(e => e.Amount) : 0m,
                    EmiCount = l.EmiPayments != null ? l.EmiPayments.Count : 0,
                    EmiPayments = l.EmiPayments != null
                        ? l.EmiPayments.OrderByDescending(e => e.PaidAt)
                            .Select(e => new { e.EmiId, e.Amount, e.PaidAt, e.Note })
                            .ToList()
                        : new List<object>() as dynamic,
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Loan load error: {ex.Message}");
            }
        }

        // ── GET recent loans ───────────────────────────────────
        [HttpGet("recent")]
        public async Task<IActionResult> GetRecent()
        {
            try
            {
                var since = DateTime.UtcNow.AddDays(-10);
                var list = await _db.Loans
                    .Include(l => l.Customer)
                    .Where(l => l.CreatedAt >= since)
                    .OrderByDescending(l => l.CreatedAt)
                    .Select(l => new {
                        l.LoanId,
                        l.LoanNo,
                        l.LoanType,
                        l.Amount,
                        l.MonthlyPayment,
                        l.Status,
                        l.Progress,
                        l.CreatedAt,
                        CustomerName = l.Customer.FullName,
                        CustomerNo = l.Customer.CustomerNo
                    })
                    .ToListAsync();
                return Ok(list);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Recent loan error: {ex.Message}");
            }
        }

        // ── POST apply ─────────────────────────────────────────
        [HttpPost("apply")]
        public async Task<IActionResult> Apply(CreateLoanDto dto)
        {
            if (dto.Amount <= 0) return BadRequest("Loan amount must be greater than zero");
            if (dto.Months <= 0) return BadRequest("Months must be greater than zero");
            if (string.IsNullOrWhiteSpace(dto.LoanType)) return BadRequest("Loan type required");

            var customer = await _db.Customers
                .Include(c => c.Accounts)
                .FirstOrDefaultAsync(c => c.CustomerId == dto.CustomerId);

            if (customer == null) return NotFound("Customer not found");
            if (!customer.Accounts.Any())
                return BadRequest($"Customer {customer.CustomerNo} has no account. Create an account first.");

            // sequential loan number
            var lastLoan = await _db.Loans
                .Where(l => l.LoanNo.StartsWith("LN"))
                .OrderByDescending(l => l.LoanNo)
                .Select(l => l.LoanNo)
                .FirstOrDefaultAsync();

            int nextLn = 10000001;
            if (lastLoan != null && int.TryParse(lastLoan.Substring(2), out int lastNum))
                nextLn = lastNum + 1;

            var loanNo = $"LN{nextLn}";

            var rate = LoanTypeConfig.GetRate(dto.LoanType);
            var years = dto.Months / 12m;
            var totalInterest = Math.Round(dto.Amount * rate / 100 * years, 2);
            var totalPayable = dto.Amount + totalInterest;
            var monthly = Math.Round(totalPayable / dto.Months, 2);

            var loan = new Loan
            {
                LoanNo = loanNo,
                LoanType = dto.LoanType,
                Amount = dto.Amount,
                Months = dto.Months,
                InterestRate = rate,
                TotalInterest = totalInterest,
                TotalPayable = totalPayable,
                MonthlyPayment = monthly,
                Status = "Pending",
                Progress = 0,
                CustomerId = dto.CustomerId
            };

            _db.Loans.Add(loan);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Loan application submitted",
                loanId = loan.LoanId,
                loanNo = loan.LoanNo,
                loanType = loan.LoanType,
                interestRate = loan.InterestRate,
                monthly,
                totalInterest,
                totalPayable,
                customerNo = customer.CustomerNo
            });
        }

        // ── PUT approve — fixed role check ─────────────────────
        [HttpPut("{id}/approve")]
        public async Task<IActionResult> Approve(int id)
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            if (role != "Admin")
                return Forbid();

            var loan = await _db.Loans.FindAsync(id);
            if (loan == null) return NotFound("Loan not found");
            if (loan.Status != "Pending")
                return BadRequest($"Loan status is '{loan.Status}'. Only Pending loans can be approved.");

            loan.Status = "Active";
            await _db.SaveChangesAsync();
            return Ok(new { message = "Loan approved and activated", loanNo = loan.LoanNo });
        }

        // ── PUT reject ─────────────────────────────────────────
        [HttpPut("{id}/reject")]
        public async Task<IActionResult> Reject(int id, [FromBody] string reason)
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            if (role != "Admin") return Forbid();

            var loan = await _db.Loans.FindAsync(id);
            if (loan == null) return NotFound("Loan not found");
            loan.Status = "Rejected";
            loan.RejectedReason = reason;
            await _db.SaveChangesAsync();
            return Ok(new { message = "Loan rejected" });
        }

        // ── POST pay EMI ───────────────────────────────────────
        [HttpPost("pay-emi")]
        public async Task<IActionResult> PayEmi([FromBody] PayInstallmentDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.LoanNo))
                return BadRequest("Loan ID is required");

            var loan = await _db.Loans
                .Include(l => l.Customer)
                    .ThenInclude(c => c.Accounts)
                .Include(l => l.EmiPayments)
                .FirstOrDefaultAsync(l => l.LoanNo == dto.LoanNo.Trim().ToUpper());

            if (loan == null)
                return NotFound($"Loan '{dto.LoanNo}' not found");

            if (loan.Status == "Pending") return BadRequest("Loan is not approved yet.");
            if (loan.Status == "Completed") return BadRequest("Loan already fully paid.");
            if (loan.Status == "Rejected") return BadRequest("Loan was rejected.");
            if (loan.Status != "Active") return BadRequest($"Loan status is '{loan.Status}'.");

            Account? account = null;

            if (!string.IsNullOrWhiteSpace(dto.CustomerNo))
            {
                var cust = await _db.Customers
                    .Include(c => c.Accounts)
                    .FirstOrDefaultAsync(c => c.CustomerNo == dto.CustomerNo.Trim().ToUpper());
                if (cust == null) return NotFound($"Customer '{dto.CustomerNo}' not found");
                account = cust.Accounts.FirstOrDefault();
                if (account == null) return BadRequest($"Customer {dto.CustomerNo} has no account");
            }
            else
            {
                account = loan.Customer?.Accounts?.FirstOrDefault();
            }

            if (account == null) return BadRequest("No account found");
            if (dto.Amount <= 0) return BadRequest("Amount must be greater than zero");
            if (account.Balance < dto.Amount)
                return BadRequest($"Insufficient balance. Balance: LKR {account.Balance:N2}. Required: LKR {dto.Amount:N2}");

            account.Balance -= dto.Amount;

            _db.Transactions.Add(new Transaction
            {
                Type = "Withdrawal",
                Amount = dto.Amount,
                Description = $"EMI — {loan.LoanNo} ({loan.LoanType})",
                AccountId = account.AccountId
            });

            _db.EmiPayments.Add(new EmiPayment
            {
                LoanId = loan.LoanId,
                Amount = dto.Amount,
                PaidAt = DateTime.UtcNow,
                Note = string.IsNullOrWhiteSpace(dto.Note)
                    ? $"EMI payment LKR {dto.Amount:N2}" : dto.Note
            });

            var totalPaid = (loan.EmiPayments?.Sum(e => e.Amount) ?? 0) + dto.Amount;
            var payable = loan.TotalPayable > 0 ? loan.TotalPayable : loan.Amount;
            loan.Progress = (int)Math.Min(Math.Round(totalPaid / payable * 100), 100);
            if (loan.Progress >= 100) loan.Status = "Completed";

            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "EMI payment successful",
                loanNo = loan.LoanNo,
                loanType = loan.LoanType,
                customerNo = loan.Customer?.CustomerNo,
                amountPaid = dto.Amount,
                newBalance = account.Balance,
                totalPaid,
                remaining = Math.Max(payable - totalPaid, 0),
                loanProgress = loan.Progress,
                loanStatus = loan.Status
            });
        }

        // ── GET export CSV ─────────────────────────────────────
        [HttpGet("export/csv")]
        public async Task<IActionResult> ExportCsv(
            [FromQuery] string? loanType,
            [FromQuery] string? status)
        {
            var q = _db.Loans.Include(l => l.Customer).AsQueryable();
            if (!string.IsNullOrWhiteSpace(loanType)) q = q.Where(l => l.LoanType == loanType);
            if (!string.IsNullOrWhiteSpace(status)) q = q.Where(l => l.Status == status);
            var loans = await q.OrderByDescending(l => l.CreatedAt).ToListAsync();

            var lines = new List<string> { "Loan ID,Type,CR Number,Customer,Amount,Rate%,Monthly EMI,Total Payable,Months,Status,Progress,Applied" };
            foreach (var l in loans)
                lines.Add($"{l.LoanNo},{l.LoanType},{l.Customer?.CustomerNo},{l.Customer?.FullName},{l.Amount},{l.InterestRate},{l.MonthlyPayment},{l.TotalPayable},{l.Months},{l.Status},{l.Progress}%,{l.CreatedAt:yyyy-MM-dd}");

            return File(System.Text.Encoding.UTF8.GetBytes(string.Join("\n", lines)),
                "text/csv", $"loans_{DateTime.Now:yyyyMMdd}.csv");
        }
    }
}