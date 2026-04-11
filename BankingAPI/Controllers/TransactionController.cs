using BankingAPI.Data;
using BankingAPI.DTOs;
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
    public class TransactionController : ControllerBase
    {
        private readonly BankingContext _db;
        public TransactionController(BankingContext db) { _db = db; }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var list = await _db.Transactions
                .Include(t => t.Account).ThenInclude(a => a.Customer)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new {
                    t.TransactionId,
                    t.Type,
                    t.Amount,
                    t.Description,
                    t.CreatedAt,
                    Customer = t.Account.Customer.FullName,
                    CustomerNo = t.Account.Customer.CustomerNo
                }).Take(100).ToListAsync();
            return Ok(list);
        }

        [HttpGet("{accountId}")]
        public async Task<IActionResult> GetByAccount(int accountId)
        {
            var list = await _db.Transactions
                .Where(t => t.AccountId == accountId)
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();
            return Ok(list);
        }

        [HttpPost("deposit")]
        public async Task<IActionResult> Deposit(DepositWithdrawDto dto)
        {
            var account = await _db.Accounts.FindAsync(dto.AccountId);
            if (account == null) return NotFound("Account not found");
            if (dto.Amount <= 0) return BadRequest("Amount must be greater than zero");
            account.Balance += dto.Amount;
            _db.Transactions.Add(new Transaction
            {
                Type = "Deposit",
                Amount = dto.Amount,
                Description = dto.Description,
                AccountId = dto.AccountId
            });
            await _db.SaveChangesAsync();
            return Ok(new { message = "Deposit successful", newBalance = account.Balance });
        }

        [HttpPost("withdraw")]
        public async Task<IActionResult> Withdraw(DepositWithdrawDto dto)
        {
            var account = await _db.Accounts.FindAsync(dto.AccountId);
            if (account == null) return NotFound("Account not found");
            if (dto.Amount <= 0) return BadRequest("Amount must be greater than zero");
            if (account.Balance < dto.Amount) return BadRequest($"Insufficient balance. Current: LKR {account.Balance:N2}");
            account.Balance -= dto.Amount;
            _db.Transactions.Add(new Transaction
            {
                Type = "Withdrawal",
                Amount = dto.Amount,
                Description = dto.Description,
                AccountId = dto.AccountId
            });
            await _db.SaveChangesAsync();
            return Ok(new { message = "Withdrawal successful", newBalance = account.Balance });
        }

        [HttpPost("transfer")]
        public async Task<IActionResult> Transfer(TransferDto dto)
        {
            var from = await _db.Accounts.FindAsync(dto.FromAccountId);
            var to = await _db.Accounts.FindAsync(dto.ToAccountId);
            if (from == null) return NotFound("Source account not found");
            if (to == null) return NotFound("Destination account not found");
            if (dto.Amount <= 0) return BadRequest("Amount must be greater than zero");
            if (from.Balance < dto.Amount) return BadRequest($"Insufficient balance. Current: LKR {from.Balance:N2}");
            from.Balance -= dto.Amount;
            to.Balance += dto.Amount;
            _db.Transactions.Add(new Transaction { Type = "Transfer Out", Amount = dto.Amount, Description = dto.Description, AccountId = dto.FromAccountId });
            _db.Transactions.Add(new Transaction { Type = "Transfer In", Amount = dto.Amount, Description = dto.Description, AccountId = dto.ToAccountId });
            await _db.SaveChangesAsync();
            return Ok(new { message = "Transfer successful", newBalance = from.Balance });
        }

        // Export transactions with date filter to CSV
        [HttpGet("export/csv")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ExportCsv(
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] string? type)
        {
            var q = _db.Transactions
                .Include(t => t.Account)
                    .ThenInclude(a => a.Customer)
                .AsQueryable();

            if (from.HasValue) q = q.Where(t => t.CreatedAt >= from.Value);
            if (to.HasValue) q = q.Where(t => t.CreatedAt <= to.Value);
            if (!string.IsNullOrWhiteSpace(type))
                q = q.Where(t => t.Type == type);

            var txs = await q.OrderByDescending(t => t.CreatedAt).ToListAsync();

            var lines = new List<string>
    {
        "ID,Date,Type,CR Number,Customer,Description,Amount"
    };

            foreach (var t in txs)
            {
                lines.Add($"T{t.TransactionId:D3},{t.CreatedAt:yyyy-MM-dd}," +
                          $"{t.Type},{t.Account.Customer.CustomerNo}," +
                          $"{t.Account.Customer.FullName}," +
                          $"{t.Description},{t.Amount}");
            }

            var csv = string.Join("\n", lines);
            var bytes = System.Text.Encoding.UTF8.GetBytes(csv);

            return File(bytes, "text/csv",
                $"transactions_{DateTime.Now:yyyyMMdd}.csv");
        }

    }


    //[ApiController]
    //[Route("api/[controller]")]
    //[Authorize]
    //public class TransactionController : ControllerBase
    //{
    //    private readonly BankingContext _db;

    //    public TransactionController(BankingContext db)
    //    {
    //        _db = db;
    //    }

    //    // GET all transactions
    //    [HttpGet]
    //    public async Task<IActionResult> GetAll()
    //    {
    //        var txs = await _db.Transactions
    //            .Include(t => t.Account)
    //                .ThenInclude(a => a.Customer)
    //            .OrderByDescending(t => t.CreatedAt)
    //            .Select(t => new {
    //                t.TransactionId,
    //                t.Type,
    //                t.Amount,
    //                t.Description,
    //                t.CreatedAt,
    //                Customer = t.Account.Customer.FullName
    //            })
    //            .Take(50)
    //            .ToListAsync();
    //        return Ok(txs);
    //    }

    //    // GET by account
    //    [HttpGet("{accountId}")]
    //    public async Task<IActionResult> GetByAccount(int accountId)
    //    {
    //        var txs = await _db.Transactions
    //            .Where(t => t.AccountId == accountId)
    //            .OrderByDescending(t => t.CreatedAt)
    //            .ToListAsync();
    //        return Ok(txs);
    //    }

    //    // POST deposit
    //    [HttpPost("deposit")]
    //    public async Task<IActionResult> Deposit(DepositWithdrawDto dto)
    //    {
    //        var account = await _db.Accounts.FindAsync(dto.AccountId);
    //        if (account == null) return NotFound("Account not found");
    //        if (dto.Amount <= 0) return BadRequest("Amount must be greater than zero");

    //        account.Balance += dto.Amount;
    //        _db.Transactions.Add(new Transaction
    //        {
    //            Type = "Deposit",
    //            Amount = dto.Amount,
    //            Description = dto.Description,
    //            AccountId = dto.AccountId
    //        });
    //        await _db.SaveChangesAsync();
    //        return Ok(new { message = "Deposit successful", newBalance = account.Balance });
    //    }

    //    // POST withdraw
    //    [HttpPost("withdraw")]
    //    public async Task<IActionResult> Withdraw(DepositWithdrawDto dto)
    //    {
    //        var account = await _db.Accounts.FindAsync(dto.AccountId);
    //        if (account == null) return NotFound("Account not found");
    //        if (dto.Amount <= 0) return BadRequest("Amount must be greater than zero");
    //        if (account.Balance < dto.Amount) return BadRequest("Insufficient balance");

    //        account.Balance -= dto.Amount;
    //        _db.Transactions.Add(new Transaction
    //        {
    //            Type = "Withdrawal",
    //            Amount = dto.Amount,
    //            Description = dto.Description,
    //            AccountId = dto.AccountId
    //        });
    //        await _db.SaveChangesAsync();
    //        return Ok(new { message = "Withdrawal successful", newBalance = account.Balance });
    //    }

    //    // POST transfer
    //    [HttpPost("transfer")]
    //    public async Task<IActionResult> Transfer(TransferDto dto)
    //    {
    //        var from = await _db.Accounts.FindAsync(dto.FromAccountId);
    //        var to = await _db.Accounts.FindAsync(dto.ToAccountId);
    //        if (from == null) return NotFound("Source account not found");
    //        if (to == null) return NotFound("Destination account not found");
    //        if (dto.Amount <= 0) return BadRequest("Amount must be greater than zero");
    //        if (from.Balance < dto.Amount) return BadRequest("Insufficient balance");

    //        from.Balance -= dto.Amount;
    //        to.Balance += dto.Amount;

    //        _db.Transactions.Add(new Transaction
    //        {
    //            Type = "Transfer Out",
    //            Amount = dto.Amount,
    //            Description = dto.Description ?? $"Transfer to #{to.AccountNumber}",
    //            AccountId = dto.FromAccountId
    //        });
    //        _db.Transactions.Add(new Transaction
    //        {
    //            Type = "Transfer In",
    //            Amount = dto.Amount,
    //            Description = dto.Description ?? $"Transfer from #{from.AccountNumber}",
    //            AccountId = dto.ToAccountId
    //        });
    //        await _db.SaveChangesAsync();
    //        return Ok(new { message = "Transfer successful", newBalance = from.Balance });
    //    }

    //}
}
