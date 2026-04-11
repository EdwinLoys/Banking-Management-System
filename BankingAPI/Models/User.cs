using System.ComponentModel.DataAnnotations;


namespace BankingAPI.Models
{
    public class User
    {
        [Key]
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string Role { get; set; } = "Teller";
        public List<Account> Accounts { get; set; } = new();
    }
}
