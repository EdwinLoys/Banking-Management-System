using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingAPI.Models
{
    public class Transaction
    {
        [Key]
        public int TransactionId { get; set; }
        public string Type { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Foreign key
        public int AccountId { get; set; }

        // Navigation — [ForeignKey] fixes the mapping error
        [ForeignKey("AccountId")]
        public Account Account { get; set; } = null!;
    }
}
