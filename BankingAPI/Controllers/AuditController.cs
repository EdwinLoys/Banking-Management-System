using BankingAPI.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BankingAPI.Controllers
{
    [ApiController]
    [Microsoft.AspNetCore.Mvc.Route("api/[controller]")]
    [Authorize(Roles = "Admin")]  // only Admin can see audit logs
    public class AuditController : ControllerBase
    {
        private readonly BankingContext _db;
        public AuditController(BankingContext db) { _db = db; }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? entity,
            [FromQuery] string? performedBy,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to)
        {
            var q = _db.AuditLogs.AsQueryable();

            if (!string.IsNullOrWhiteSpace(entity))
                q = q.Where(a => a.Entity == entity);

            if (!string.IsNullOrWhiteSpace(performedBy))
                q = q.Where(a => a.PerformedBy.Contains(performedBy));

            if (from.HasValue) q = q.Where(a => a.CreatedAt >= from.Value);
            if (to.HasValue) q = q.Where(a => a.CreatedAt <= to.Value);

            var list = await q
                .OrderByDescending(a => a.CreatedAt)
                .Take(200)
                .ToListAsync();

            return Ok(list);
        }
    }
}
