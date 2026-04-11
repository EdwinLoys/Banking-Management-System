using System.ComponentModel.DataAnnotations;

namespace BankingAPI.Models
{
    public class Customer
    {
        [Key]
        public int CustomerId { get; set; }
        public string CustomerNo { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Status { get; set; } = "Active";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public List<Account> Accounts { get; set; } = new();
        public List<Loan> Loans { get; set; } = new();
    }
}
