using BankingAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace BankingAPI.Data
{
    public class BankingContext : DbContext
    {
        public BankingContext(DbContextOptions<BankingContext>options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<Account> Accounts { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<Loan> Loans { get; set; }
        public DbSet<EmiPayment> EmiPayments { get; set; }
        public DbSet<LoanPayment> LoanPayments { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {

            //// unique indexes
            //modelBuilder.Entity<Account>()
            //    .HasIndex(a => a.AccountNumber).IsUnique();

            //modelBuilder.Entity<Customer>()
            //    .HasIndex(c => c.CustomerNo).IsUnique();

            //modelBuilder.Entity<Loan>()
            //    .HasIndex(l => l.LoanNo).IsUnique();

            //// relationships
            //modelBuilder.Entity<Account>()
            //    .HasOne(a => a.Customer).WithMany(c => c.Accounts)
            //    .HasForeignKey(a => a.CustomerId)
            //    .OnDelete(DeleteBehavior.Cascade);

            //modelBuilder.Entity<Transaction>()
            //    .HasOne(t => t.Account).WithMany(a => a.Transactions)
            //    .HasForeignKey(t => t.AccountId)
            //    .OnDelete(DeleteBehavior.Cascade);

            //modelBuilder.Entity<Loan>()
            //    .HasOne(l => l.Customer).WithMany(c => c.Loans)
            //    .HasForeignKey(l => l.CustomerId)
            //    .OnDelete(DeleteBehavior.Cascade);

            //modelBuilder.Entity<EmiPayment>()
            //    .HasOne(e => e.Loan).WithMany(l => l.EmiPayments)
            //    .HasForeignKey(e => e.LoanId)
            //    .OnDelete(DeleteBehavior.Cascade);


            // Unique account number
            modelBuilder.Entity<Account>()
                .HasIndex(a => a.AccountNumber)
                .IsUnique();

            // Relationship: Account → Customer
            modelBuilder.Entity<Account>()
                .HasOne(a => a.Customer)
                .WithMany(c => c.Accounts)
                .HasForeignKey(a => a.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            // Relationship: Transaction → Account
            modelBuilder.Entity<Transaction>()
                .HasOne(t => t.Account)
                .WithMany(a => a.Transactions)
                .HasForeignKey(t => t.AccountId)
                .OnDelete(DeleteBehavior.Cascade);

            // Relationship: Loan → Customer
            modelBuilder.Entity<Loan>()
                .HasOne(l => l.Customer)
                .WithMany(c => c.Loans)
                .HasForeignKey(l => l.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<EmiPayment>()
               .HasOne(e => e.Loan)
               .WithMany(l => l.EmiPayments)
               .HasForeignKey(e => e.LoanId)
               .OnDelete(DeleteBehavior.Cascade);

            // Relationship: LoanPayment → Loan
            modelBuilder.Entity<LoanPayment>()
                .HasOne(p => p.Loan)
                .WithMany(l => l.Payments)
                .HasForeignKey(p => p.LoanId)
                .OnDelete(DeleteBehavior.Cascade);



        }
    }
}
