using BankingAPI.Data;
using BankingAPI.Models;

namespace BankingAPI.Services
{
    public class AuditService
    {
        private readonly BankingContext _db;
        public AuditService(BankingContext db) { _db = db; }

        public async Task LogAsync(
            string action,
            string entity,
            string entityId,
            string performedBy,
            string userRole,
            string details = "")
        {
            _db.AuditLogs.Add(new AuditLog
            {
                Action = action,
                Entity = entity,
                EntityId = entityId,
                PerformedBy = performedBy,
                UserRole = userRole,
                Details = details,
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();
        }
    }
}
