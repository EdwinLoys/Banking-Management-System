# 🏛 Banking Management System

A full-stack banking management system built with **ASP.NET Core 8** and **React.js**, featuring role-based access control, loan management with EMI processing, fraud detection, audit logging, and cloud-ready deployment.

---

## 🖼 Screenshots

| Login Page | Dashboard | Loan Management |
|---|---|---|
| Role-based login (Admin / Employee) | Real-time overview with recent activity | 4 loan types with EMI calculator |

<img width="1890" height="866" alt="Login Page" src="https://github.com/user-attachments/assets/527b4998-a5df-486c-8ade-f315d971fc45" />
<img width="1910" height="2236" alt="DashBoard" src="https://github.com/user-attachments/assets/2a79d4e2-489b-47be-8048-91c500ee8005" />
<img width="1897" height="867" alt="Loan " src="https://github.com/user-attachments/assets/6aee0350-8484-4ee5-86f9-a4974e787bd8" />


---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React.js, Axios, React Router DOM |
| **Backend** | C# ASP.NET Core 8 Web API |
| **Database** | SQL Server + Entity Framework Core 8 |
| **Authentication** | JWT (JSON Web Tokens) + BCrypt password hashing |
| **Deployment** | Azure App Service / AWS Elastic Beanstalk |

---

## ✅ Features

### 🔐 Security & Authentication
- JWT-based authentication with 7-day token expiry
- BCrypt password hashing for secure storage
- Role-Based Access Control (Admin / Employee)
- Audit logging — tracks every action with user, role, timestamp

### 👤 Customer Management
- Auto-generated sequential CR numbers (CR10000001, CR10000002...)
- Customer registration with email, phone, status
- Search by name, phone, or CR number
- Per-customer PDF report generation

### 🏦 Account Management
- Multiple account types: Savings, Checking, Current, Credit Card
- Live balance tracking — updates after every transaction and EMI payment
- Account linked to customer via CR number

### 💳 Loan Management
- **4 loan types** with individual interest rates:
  - 👤 Personal Loan — 14.5% p.a.
  - 🏠 Home Loan — 8.5% p.a.
  - 🚗 Vehicle Loan — 10.5% p.a.
  - 💼 Business Loan — 12.0% p.a.
- Live EMI calculator (principal + interest + monthly payment)
- Loan approval workflow (Admin only)
- EMI payment with automatic account balance deduction
- Progress tracking and EMI history

### ⇄ Transaction Engine
- Deposit, Withdrawal, Transfer
- Transaction recorded against CR number
- 10-day recent transaction view on dashboard

### 📊 Reports & Export
- PDF reports for individual customers (accounts + loans + transactions)
- Bulk PDF print for Customers, Accounts, Loans, Transactions
- CSV export with filters (date range, type, status) — Admin only

### 🚨 Fraud Detection (Admin only)
- Large transaction alerts (≥ LKR 100,000)
- Suspicious activity detection (multiple large withdrawals in one day)
- Delinquent loan detection (no EMI in 35+ days)

### 📋 Audit Logging (Admin only)
- Tracks: action, entity, entity ID, performed by, role, timestamp

---

## 🏗 Project Structure

```
BankingAPI/                     ← ASP.NET Core 8 Web API
├── Controllers/
│   ├── AuthController.cs       ← Login, staff creation
│   ├── CustomerController.cs   ← CRUD + CR number generation
│   ├── AccountController.cs    ← Account management
│   ├── TransactionController.cs← Deposit, Withdrawal, Transfer
│   ├── LoanController.cs       ← Loan apply, approve, EMI payment
│   ├── AuditController.cs      ← Audit log viewer (Admin)
│   └── FraudController.cs      ← Fraud detection (Admin)
├── Models/
│   ├── User.cs
│   ├── Customer.cs             ← CustomerNo (CR number)
│   ├── Account.cs
│   ├── Transaction.cs
│   ├── Loan.cs                 ← LoanType, InterestRate, TotalPayable
│   ├── EmiPayment.cs
│   └── AuditLog.cs
├── DTOs/                       ← Data Transfer Objects
├── Data/
│   └── BankingContext.cs       ← EF Core DbContext
├── Helpers/
│   └── LoanTypeConfig.cs       ← Interest rate calculations
└── Services/
    └── AuditService.cs

banking-frontend/               ← React.js
├── src/
│   ├── pages/
│   │   ├── Login.jsx           ← Role-based login page
│   │   └── Dashboard.jsx       ← Full banking dashboard
│   └── App.js                  ← Route setup
```

---

## ⚙️ Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [SQL Server](https://www.microsoft.com/sql-server) (Developer Edition — free)
- [Node.js 18+](https://nodejs.org)
- [Visual Studio 2022](https://visualstudio.microsoft.com)

### 1 — Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/banking-management-system.git
cd banking-management-system
```

### 2 — Configure the backend

Open `BankingAPI/appsettings.json` and update:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=BankingDB;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Key": "BankingApp@Super#Secret!Key2024Secure"
  }
}
```

### 3 — Run database migrations

Open **Package Manager Console** in Visual Studio:

```bash
Add-Migration InitialCreate
Update-Database
```

### 4 — Create the first Admin account

Start the API (press **F5**), then call this in Swagger (`https://localhost:7001/swagger`):

```
POST /api/auth/create-staff
```
```json
{
  "fullName": "Bank Admin",
  "email":    "admin@bank.com",
  "password": "Admin@123",
  "role":     "Admin"
}
```

### 5 — Start the React frontend

```bash
cd banking-frontend
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🔑 Default Login

| Role | Email | Password |
|---|---|---|
| Admin | admin@bank.com | Admin@123 |
| Employee | employee@bank.com | Employee@123 |

> ⚠️ Change passwords immediately in a production environment.

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login — returns JWT token |
| POST | `/api/auth/create-staff` | Create Admin or Employee account |

### Customer
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/customer` | Get all customers (with search/filter) |
| GET | `/api/customer/recent` | Customers created in last 10 days |
| GET | `/api/customer/{id}` | Get customer by ID (for PDF) |
| GET | `/api/customer/by-crno/{crNo}` | Get customer by CR number |
| POST | `/api/customer` | Create customer (auto CR number) |
| PUT | `/api/customer/{id}` | Update customer |
| DELETE | `/api/customer/{id}` | Delete customer (Admin only) |
| GET | `/api/customer/export/csv` | Export customers to CSV |

### Account
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/account` | Get all accounts |
| GET | `/api/account/recent` | Accounts created in last 10 days |
| GET | `/api/account/summary` | Balance summary by account type |
| POST | `/api/account/create` | Create account linked to CR number |

### Transaction
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/transaction` | Get all transactions |
| POST | `/api/transaction/deposit` | Deposit to account |
| POST | `/api/transaction/withdraw` | Withdraw from account |
| POST | `/api/transaction/transfer` | Transfer between accounts |
| GET | `/api/transaction/export/csv` | Export transactions to CSV |

### Loan
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/loan` | Get all loans |
| GET | `/api/loan/types` | Get loan types and rates |
| POST | `/api/loan/apply` | Apply for loan (auto LN number) |
| PUT | `/api/loan/{id}/approve` | Approve loan (Admin only) |
| PUT | `/api/loan/{id}/reject` | Reject loan (Admin only) |
| POST | `/api/loan/pay-emi` | Pay EMI installment |
| GET | `/api/loan/export/csv` | Export loans to CSV |

### Admin Only
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/audit` | View audit log |
| GET | `/api/fraud/large-transactions` | Large transaction alerts |
| GET | `/api/fraud/suspicious-activity` | Suspicious activity alerts |
| GET | `/api/fraud/delinquent-loans` | Overdue EMI loans |

---

## ☁️ Deployment

### Azure
- **API** → Azure App Service (Windows, .NET 8)
- **Frontend** → Azure Static Web Apps
- **Database** → Azure SQL Database

### AWS
- **API** → AWS Elastic Beanstalk (.NET 8)
- **Frontend** → S3 + CloudFront
- **Database** → Amazon RDS (SQL Server)

---

## 📄 License

This project is built for learning and portfolio purposes.

---

## 👤 Author

**Edwin Loys**
- GitHub: [@YOUR_GITHUB](https://github.com/YOUR_GITHUB)
- LinkedIn: [linkedin.com/in/YOUR_LINKEDIN](https://linkedin.com/in/YOUR_LINKEDIN)
