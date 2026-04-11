using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BankingAPI.Models
{
    public class Loan
    {
        [Key]
        public int LoanId { get; set; }

        public string LoanNo { get; set; } = string.Empty;

        public string LoanType { get; set; } = "Personal Loan";

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        public int Months { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal MonthlyPayment { get; set; }

        [Column(TypeName = "decimal(5,2)")]
        public decimal InterestRate { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalInterest { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalPayable { get; set; }

        public string Status { get; set; } = "Pending";

        public int Progress { get; set; } = 0;

        public string? RejectedReason { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalPaid { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Foreign key
        public int CustomerId { get; set; }

        // Navigation
        [ForeignKey("CustomerId")]
        public Customer Customer { get; set; } = null!;

        public List<EmiPayment> EmiPayments { get; set; } = new();

        public List<LoanPayment> Payments { get; set; } = new();


    }
}
