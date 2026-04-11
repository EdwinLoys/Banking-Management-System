using BankingAPI.Data;
using BankingAPI.DTOs;
using BankingAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BankingAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CustomerController : ControllerBase
    {
        private readonly BankingContext _db;

        public CustomerController(BankingContext db)
        {
            _db = db;
        }

        // ── Generate CR Number ─────────────────────────
        private async Task<string> GenerateCRNumber()
        {
            var allCRNumbers = await _db.Customers
                .Where(c => c.CustomerNo.StartsWith("CR"))
                .Select(c => c.CustomerNo)
                .ToListAsync();

            int maxNum = 10000000; 

            foreach (var cr in allCRNumbers)
            {
                if (cr.Length > 2 && int.TryParse(cr.Substring(2), out int n))
                {
                    if (n > maxNum) maxNum = n;
                }
            }

            string newCR = $"CR{maxNum + 1}";

            while (await _db.Customers.AnyAsync(c => c.CustomerNo == newCR))
            {
                maxNum++;
                newCR = $"CR{maxNum + 1}";
            }

            return newCR;
        }

        // ── GET all customers ──────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? search,
            [FromQuery] string? status)
        {
            try
            {
                var q = _db.Customers
                    .Include(c => c.Accounts)
                    .AsQueryable();

                if (!string.IsNullOrWhiteSpace(status) && status != "All")
                    q = q.Where(c => c.Status == status);

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.Trim().ToLower();
                    q = q.Where(c =>
                        c.FullName.ToLower().Contains(s) ||
                        c.Phone.Contains(s) ||
                        c.CustomerNo.ToLower().Contains(s) ||
                        c.Email.ToLower().Contains(s));
                }

                var list = await q.OrderByDescending(c => c.CreatedAt).ToListAsync();

                // Get loan counts separately to avoid EF navigation issues
                var custIds = list.Select(c => c.CustomerId).ToList();
                var loanCounts = await _db.Loans
                    .Where(l => custIds.Contains(l.CustomerId))
                    .GroupBy(l => l.CustomerId)
                    .Select(g => new { CustomerId = g.Key, Total = g.Count(), Active = g.Count(l => l.Status == "Active") })
                    .ToListAsync();

                var result = list.Select(c => {
                    var lc = loanCounts.FirstOrDefault(l => l.CustomerId == c.CustomerId);
                    return new
                    {
                        c.CustomerId,
                        c.CustomerNo,
                        c.FullName,
                        c.Email,
                        c.Phone,
                        c.Status,
                        c.CreatedAt,
                        Balance = c.Accounts.Sum(a => a.Balance),
                        AccountCount = c.Accounts.Count,
                        TotalLoans = lc?.Total ?? 0,
                        ActiveLoans = lc?.Active ?? 0,
                        Accounts = c.Accounts.Select(a => new {
                            a.AccountId,
                            a.AccountNumber,
                            a.AccountType,
                            a.Balance,
                            a.CreatedAt
                        })
                    };
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Customer load error: {ex.Message} | {ex.InnerException?.Message}");
            }
        }

        // ── GET recent customers ───────────────────────
        [HttpGet("recent")]
        public async Task<IActionResult> GetRecent()
        {
            try
            {
                var since = DateTime.UtcNow.AddDays(-10);
                var list = await _db.Customers
                    .Where(c => c.CreatedAt >= since)
                    .OrderByDescending(c => c.CreatedAt)
                    .Select(c => new {
                        c.CustomerId,
                        c.CustomerNo,
                        c.FullName,
                        c.Email,
                        c.Phone,
                        c.Status,
                        c.CreatedAt
                    })
                    .ToListAsync();
                return Ok(list);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Recent customer error: {ex.Message}");
            }
        }

        // ── CREATE ─────────────────────────────────────
        [HttpPost]
        public async Task<IActionResult> Create(CreateCustomerDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FullName))
                return BadRequest("Full name required");

            if (await _db.Customers.AnyAsync(x => x.Email == dto.Email))
                return BadRequest("Email already exists");

            var customer = new Customer
            {
                CustomerNo = await GenerateCRNumber(),
                FullName = dto.FullName,
                Email = dto.Email,
                Phone = dto.Phone
            };

            _db.Customers.Add(customer);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Customer created",
                customer.CustomerNo
            });
        }

        // ── UPDATE ─────────────────────────────────────
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateCustomerDto dto)
        {
            var c = await _db.Customers.FindAsync(id);

            if (c == null)
                return NotFound("Customer not found");

            c.FullName = dto.FullName;
            c.Email = dto.Email;
            c.Phone = dto.Phone;
            c.Status = dto.Status;

            await _db.SaveChangesAsync();

            return Ok(new { message = "Customer updated" });
        }

        // ── DELETE (ADMIN ONLY) ────────────────────────
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var customer = await _db.Customers
                .Include(c => c.Accounts)
                .Include(c => c.Loans)
                .FirstOrDefaultAsync(c => c.CustomerId == id);

            if (customer == null)
                return NotFound("Customer not found");

            // 🚫 Prevent delete if active loans exist
            if (customer.Loans.Any(l => l.Status == "Active"))
                return BadRequest("Cannot delete customer with active loans");

            // 🚫 Prevent delete if balance exists
            if (customer.Accounts.Any(a => a.Balance > 0))
                return BadRequest("Cannot delete customer with account balance");

            // OPTIONAL: prevent delete if any loans exist at all
            if (customer.Loans.Any())
                return BadRequest("Customer has loan history. Cannot delete");

            _db.Customers.Remove(customer);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Customer deleted successfully" });
        }

        // ── ADD MONEY ──────────────────────────────────
        [HttpPost("add-amount")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> AddAmount(AddAmountDto dto)
        {
            var account = await _db.Accounts.FindAsync(dto.AccountId);

            if (account == null)
                return NotFound("Account not found");

            if (dto.Amount <= 0)
                return BadRequest("Amount must be greater than zero");

            account.Balance += dto.Amount;

            _db.Transactions.Add(new Transaction
            {
                Type = "Deposit",
                Amount = dto.Amount,
                Description = "Admin deposit",
                AccountId = account.AccountId
            });

            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Amount added",
                newBalance = account.Balance
            });
        }

        // Export customers to CSV
        [HttpGet("export/csv")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ExportCsv()
        {
            var customers = await _db.Customers
                .Include(c => c.Accounts)
                .ToListAsync();

            var lines = new List<string>
            {
                "CR Number,Full Name,Email,Phone,Status,Balance,Joined"
            };

            foreach (var c in customers)
            {
                var balance = c.Accounts.Sum(a => a.Balance);
                lines.Add($"{c.CustomerNo},{c.FullName},{c.Email},{c.Phone},{c.Status},{balance},{c.CreatedAt:yyyy-MM-dd}");
            }

            var csv = string.Join("\n", lines);
            var bytes = System.Text.Encoding.UTF8.GetBytes(csv);

            return File(bytes, "text/csv",
                $"customers_{DateTime.Now:yyyyMMdd}.csv");
        }

        [HttpGet("debug")]
        public async Task<IActionResult> Debug()
        {
            try
            {
                // Test 1 — basic count
                var count = await _db.Customers.CountAsync();

                // Test 2 — with accounts
                var withAccounts = await _db.Customers
                    .Include(c => c.Accounts)
                    .Select(c => new {
                        c.CustomerId,
                        c.CustomerNo,
                        c.FullName,
                        accountCount = c.Accounts.Count,
                        balance = c.Accounts.Sum(a => a.Balance)
                    })
                    .ToListAsync();

                return Ok(new
                {
                    customerCount = count,
                    customers = withAccounts
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    error = ex.Message,
                    details = ex.InnerException?.Message
                });
            }
        }

        // GET by id — full data for PDF — fix the navigation includes
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var c = await _db.Customers
                    .Include(c => c.Accounts)
                        .ThenInclude(a => a.Transactions)
                    .FirstOrDefaultAsync(c => c.CustomerId == id);

                if (c == null) return NotFound("Customer not found");

                // Load loans separately to avoid EF navigation issues
                var loans = await _db.Loans
                    .Include(l => l.EmiPayments)
                    .Where(l => l.CustomerId == id)
                    .ToListAsync();

                return Ok(new
                {
                    c.CustomerId,
                    c.CustomerNo,
                    c.FullName,
                    c.Email,
                    c.Phone,
                    c.Status,
                    c.CreatedAt,
                    Accounts = c.Accounts.Select(a => new {
                        a.AccountId,
                        a.AccountNumber,
                        a.AccountType,
                        a.Balance,
                        a.CreatedAt,
                        Transactions = a.Transactions
                            .OrderByDescending(t => t.CreatedAt)
                            .Take(20)
                            .Select(t => new {
                                t.TransactionId,
                                t.Type,
                                t.Amount,
                                t.Description,
                                t.CreatedAt
                            })
                    }),
                    Loans = loans.Select(l => new {
                        l.LoanId,
                        l.LoanNo,
                        l.LoanType,
                        l.Amount,
                        l.MonthlyPayment,
                        l.InterestRate,
                        l.TotalPayable,
                        l.Months,
                        l.Status,
                        l.Progress,
                        EmiPayments = l.EmiPayments.Select(e => new {
                            e.EmiId,
                            e.Amount,
                            e.PaidAt,
                            e.Note
                        })
                    })
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"GetById error: {ex.Message}");
            }
        }
    }
}