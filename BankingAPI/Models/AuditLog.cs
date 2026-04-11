using System.ComponentModel.DataAnnotations;

namespace BankingAPI.Models
{
    public class AuditLog
    {
        [Key]
        public int AuditId { get; set; }
        public string Action { get; set; } = ""; 
        public string Entity { get; set; } = ""; 
        public string EntityId { get; set; } = ""; 
        public string PerformedBy { get; set; } = ""; 
        public string UserRole { get; set; } = "";
        public string Details { get; set; } = "";
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
