// Controllers/AuthController.cs — complete fixed version
using BankingAPI.Data;
using BankingAPI.DTOs;
using BankingAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace BankingAPI.Controllers
{
    [ApiController]
    [Microsoft.AspNetCore.Mvc.Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly BankingContext _db;
        private readonly IConfiguration _cfg;

        public AuthController(BankingContext db, IConfiguration cfg)
        { _db = db; _cfg = cfg; }

        // POST /api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest(new { message = "Email and password are required" });

            var user = await _db.Users
                .FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower().Trim());

            if (user == null)
                return Unauthorized(new { message = "Email not found. Check your email address." });

            if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return Unauthorized(new { message = "Wrong password. Please try again." });

            var token = MakeToken(user);

            return Ok(new
            {
                token,
                userId = user.UserId,
                fullName = user.FullName,
                email = user.Email,
                role = user.Role   // "Admin" or "Employee"
            });
        }

        // POST /api/auth/create-staff — visible in Swagger
        [HttpPost("create-staff")]
        public async Task<IActionResult> CreateStaff([FromBody] RegisterDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
                return BadRequest(new { message = "Email is required" });
            if (string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest(new { message = "Password is required" });
            if (string.IsNullOrWhiteSpace(dto.FullName))
                return BadRequest(new { message = "Full name is required" });

            if (await _db.Users.AnyAsync(u => u.Email == dto.Email.ToLower().Trim()))
                return BadRequest(new { message = "Email already exists" });

            // First user ever becomes Admin automatically
            var isFirst = !await _db.Users.AnyAsync();
            var role = isFirst ? "Admin"
                        : (dto.Role?.Trim() == "Admin" ? "Admin" : "Employee");

            var user = new User
            {
                FullName = dto.FullName.Trim(),
                Email = dto.Email.ToLower().Trim(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = role
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = $"{role} account created successfully",
                userId = user.UserId,
                fullName = user.FullName,
                email = user.Email,
                role = user.Role
            });
        }

        private string MakeToken(User user)
        {
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_cfg["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Email,          user.Email),
                new Claim(ClaimTypes.Name,           user.FullName),
                new Claim(ClaimTypes.Role,           user.Role),
            };
            var t = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: creds);
            return new JwtSecurityTokenHandler().WriteToken(t);
        }
    }
}