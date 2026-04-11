using BankingAPI.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BankingAPI.Controllers
{
    [ApiController]
    [Microsoft.AspNetCore.Mvc.Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class FraudController : ControllerBase
    {
        private readonly BankingContext _db;
        public FraudController(BankingContext db) { _db = db; }

        // GET large transactions (potential fraud)
        [HttpGet("large-transactions")]
        public async Task<IActionResult> LargeTransactions(
            [FromQuery] decimal threshold = 100000)
        {
            var list = await _db.Transactions
                .Include(t => t.Account)
                    .ThenInclude(a => a.Customer)
                .Where(t => t.Amount >= threshold)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new {
                    t.TransactionId,
                    t.Type,
                    t.Amount,
                    t.Description,
                    t.CreatedAt,
                    CustomerNo = t.Account.Customer.CustomerNo,
                    CustomerName = t.Account.Customer.FullName,
                    Flag = "⚠️ Large Transaction"
                })
                .ToListAsync();

            return Ok(new { threshold, count = list.Count, list });
        }

        // GET customers with multiple large withdrawals today
        [HttpGet("suspicious-activity")]
        public async Task<IActionResult> SuspiciousActivity()
        {
            var today = DateTime.UtcNow.Date;
            var list = await _db.Transactions
                .Include(t => t.Account)
                    .ThenInclude(a => a.Customer)
                .Where(t =>
                    t.Type == "Withdrawal" &&
                    t.CreatedAt >= today &&
                    t.Amount >= 50000)
                .GroupBy(t => t.Account.Customer.CustomerNo)
                .Where(g => g.Count() >= 2)
                .Select(g => new {
                    CustomerNo = g.Key,
                    CustomerName = g.First().Account.Customer.FullName,
                    TxCount = g.Count(),
                    TotalAmount = g.Sum(t => t.Amount),
                    Flag = "🚨 Multiple Large Withdrawals Today"
                })
                .ToListAsync();

            return Ok(new { date = today, count = list.Count, list });
        }

        // GET delinquent loans (overdue EMI)
        [HttpGet("delinquent-loans")]
        public async Task<IActionResult> DelinquentLoans()
        {
            // Loans that are Active but have no EMI payment in 35+ days
            var cutoff = DateTime.UtcNow.AddDays(-35);
            var list = await _db.Loans
                .Include(l => l.Customer)
                .Include(l => l.EmiPayments)
                .Where(l => l.Status == "Active")
                .Where(l =>
                    !l.EmiPayments.Any() ||
                    l.EmiPayments.Max(e => e.PaidAt) < cutoff)
                .Select(l => new {
                    l.LoanNo,
                    l.LoanType,
                    l.Amount,
                    l.MonthlyPayment,
                    l.Progress,
                    CustomerNo = l.Customer.CustomerNo,
                    CustomerName = l.Customer.FullName,
                    LastPayment = l.EmiPayments.Any()
                        ? l.EmiPayments.Max(e => e.PaidAt)
                        : (DateTime?)null,
                    Flag = "⚠️ EMI Overdue"
                })
                .ToListAsync();

            return Ok(new { count = list.Count, list });
        }
    }
}
