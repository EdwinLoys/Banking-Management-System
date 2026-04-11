using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingAPI.Models
{
    public class LoanPayment
    {
        [Key]
        public int PaymentId { get; set; }
        public int LoanId { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }
        public string Description { get; set; } = string.Empty;
        public DateTime PaidAt { get; set; }

        [ForeignKey("LoanId")]
        public Loan Loan { get; set; } = null!;
    }
}
