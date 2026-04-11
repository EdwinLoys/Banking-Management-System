namespace BankingAPI.DTOs
{
    public class CreateAccountDto
    {
        public int CustomerId { get; set; }
        public string AccountType { get; set; } = string.Empty;
    }
}