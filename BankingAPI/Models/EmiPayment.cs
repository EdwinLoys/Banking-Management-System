// Models/EmiPayment.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingAPI.Models
{
    public class EmiPayment
    {
        [Key]
        public int EmiId { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        public DateTime PaidAt { get; set; } = DateTime.UtcNow;
        public string Note { get; set; } = string.Empty;

        public int LoanId { get; set; }

        [ForeignKey("LoanId")]
        public Loan Loan { get; set; } = null!;
    }
}