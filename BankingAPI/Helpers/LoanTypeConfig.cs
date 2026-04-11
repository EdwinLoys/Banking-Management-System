namespace BankingAPI.Helpers
{
    public class LoanTypeConfig
    {
        private static readonly Dictionary<string, decimal> Rates = new()
        {
            { "Personal Loan", 14.5m },
            { "Home Loan",      8.5m },
            { "Vehicle Loan",  10.5m },
            { "Business Loan", 12.0m },
        };

        public static decimal GetRate(string loanType)
        {
            return Rates.TryGetValue(loanType, out var rate) ? rate : 14.5m;
        }

        public static string[] GetAllTypes() => Rates.Keys.ToArray();

        // ✅ Calculate EMI using flat interest formula
        // Monthly = (Principal + TotalInterest) / Months
        // TotalInterest = Principal * Rate/100 * Years
        public static (decimal monthly, decimal totalInterest, decimal totalPayable)
            Calculate(decimal amount, int months, string loanType)
        {
            var rate = GetRate(loanType);
            var years = months / 12m;
            var totalInterest = Math.Round(amount * rate / 100 * years, 2);
            var totalPayable = amount + totalInterest;
            var monthly = Math.Round(totalPayable / months, 2);
            return (monthly, totalInterest, totalPayable);
        }
    }
}
