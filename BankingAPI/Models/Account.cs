using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingAPI.Models
{
    public class Account
    {
        [Key]
        public int AccountId { get; set; }
        public string AccountNumber { get; set; } = string.Empty;
        public string AccountType { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Balance { get; set; } = 0;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public int CustomerId { get; set; }

        // Navigation — [ForeignKey] tells EF this is a relationship, not a column
        [ForeignKey("CustomerId")]
        public Customer Customer { get; set; } = null!;

        public List<Transaction> Transactions { get; set; } = new();
    }
}
