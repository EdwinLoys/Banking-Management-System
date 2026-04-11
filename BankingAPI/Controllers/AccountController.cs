using BankingAPI.Data;
using BankingAPI.DTOs;
using BankingAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BankingAPI.Controllers
{
    [ApiController]
    [Microsoft.AspNetCore.Mvc.Route("api/[controller]")]
    [Authorize]
    public class AccountController : ControllerBase
    {
        private readonly BankingContext _db;

        public AccountController(BankingContext db )
        {
            _db = db;
        }

        // GET all accounts
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var list = await _db.Accounts
                .Include(a => a.Customer)
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new {
                    a.AccountId,
                    a.AccountNumber,
                    a.AccountType,
                    a.Balance,
                    a.CreatedAt,
                    CustomerName = a.Customer.FullName,
                    CustomerNo = a.Customer.CustomerNo,
                    CustomerId = a.Customer.CustomerId
                })
                .ToListAsync();
            return Ok(list);
        }

        // GET recent accounts — last 10 days
        [HttpGet("recent")]
        public async Task<IActionResult> GetRecent()
        {
            var since = DateTime.UtcNow.AddDays(-10);
            var list = await _db.Accounts
                .Include(a => a.Customer)
                .Where(a => a.CreatedAt >= since)
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new {
                    a.AccountId,
                    a.AccountNumber,
                    a.AccountType,
                    a.Balance,
                    a.CreatedAt,
                    CustomerName = a.Customer.FullName,
                    CustomerNo = a.Customer.CustomerNo
                })
                .ToListAsync();
            return Ok(list);
        }

        // GET summary for top cards
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var accounts = await _db.Accounts.ToListAsync();
            return Ok(new
            {
                totalAccounts = accounts.Count,
                checkingBalance = accounts
                    .Where(a => a.AccountType == "Checking Account")
                    .Sum(a => a.Balance),
                savingsBalance = accounts
                    .Where(a => a.AccountType == "Savings Account")
                    .Sum(a => a.Balance),
                creditBalance = accounts
                    .Where(a => a.AccountType == "Credit Card Balance")
                    .Sum(a => a.Balance),
            });
        }

        // POST create account
        [HttpPost("create")]
        public async Task<IActionResult> Create(CreateAccountDto dto)
        {
            Customer? customer = await _db.Customers.FindAsync(dto.CustomerId);
            if (customer == null)
                return NotFound("Customer not found. Check the Customer ID.");

            var rng = new Random();
            string accNo;
            do { accNo = rng.NextInt64(1000000000L, 9999999999L).ToString(); }
            while (await _db.Accounts.AnyAsync(a => a.AccountNumber == accNo));

            var account = new Account
            {
                AccountNumber = accNo,
                AccountType = dto.AccountType,
                Balance = 0,
                CustomerId = customer.CustomerId
            };
            _db.Accounts.Add(account);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Account created successfully",
                accountId = account.AccountId,
                accountNumber = account.AccountNumber
            });
        }
    }
}