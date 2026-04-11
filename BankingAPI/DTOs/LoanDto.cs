namespace BankingAPI.DTOs
{
    public class CreateLoanDto
    {
        public int CustomerId { get; set; }
        public string LoanType { get; set; } = "Personal Loan";
        public decimal Amount { get; set; }
        public int Months { get; set; }
    }

    public class PayInstallmentDto
    {
        public string LoanNo { get; set; } = "";   
        public decimal Amount { get; set; }
        public string Note { get; set; } = "";
        public string CustomerNo { get; set; } = string.Empty;
    }

    public class RejectLoanDto
    {
        public string Reason { get; set; } = "";
    }

}
