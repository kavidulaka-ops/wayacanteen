# University Canteen Management System

A Java Web Application built using Java Servlets, Jakarta EE, MySQL, HTML5, CSS3, and JavaScript.

---

## 📁 Directory Structure

```text
antigravity project/
├── pom.xml                                  <-- Maven Configuration
├── schema.sql                               <-- MySQL Database Backup / Table DDL
└── src/
    └── main/
        ├── java/
        │   ├── controller/                  <-- Java Servlets
        │   │   ├── LoginServlet.java
        │   │   ├── StaffLoginServlet.java
        │   │   ├── FoodServlet.java
        │   │   ├── OrderServlet.java
        │   │   ├── PendingOrdersServlet.java
        │   │   ├── OrderDetailsServlet.java
        │   │   ├── OrderHistoryServlet.java
        │   │   ├── StudentOrderHistoryServlet.java
        │   │   ├── StationeryServlet.java
        │   │   ├── FinanceServlet.java
        │   │   ├── BudgetServlet.java
        │   │   ├── ResetPasswordServlet.java
        │   │   ├── StaffResetPasswordServlet.java
        │   │   ├── HelpSubmitServlet.java
        │   │   ├── HelpStatusServlet.java
        │   │   ├── StaffHelpServlet.java
        │   │   └── PasswordUtil.java
        │   ├── db/
        │   │   ├── DBConnection.java        <-- Database Connection Handler
        │   │   └── DBTest.java
        │   └── service/
        │       └── EmailService.java        <-- Password reset / OTP mail service
        └── webapp/
            ├── WEB-INF/
            │   ├── web.xml                  <-- Web Deployment Descriptor
            │   └── lib/                     <-- JAR Dependencies (MySQL, Mail API)
            ├── index.html                   <-- Student Login Page
            ├── staff-login.html             <-- Staff Login Page
            ├── home.html                    <-- Student Home / Portal
            ├── food.html                    <-- Food Menu
            ├── cart.html                    <-- Shopping Cart
            ├── order.html                   <-- Place Order / Checkout
            ├── order-details.html           <-- Order Details
            ├── order-history.html           <-- Order History
            ├── pending-orders.html          <-- Staff Pending Orders
            ├── staff-dashboard.html         <-- Staff Dashboard
            ├── qr-scanner.html              <-- Order QR Verification
            ├── finance.html                 <-- Student Assistance / Finance
            ├── stationery.html              <-- Stationery Store
            ├── help-center.html             <-- Help & Support
            └── (Corresponding CSS & JS files for each page)
```

---

## 🗄️ Database Setup (WampServer / MySQL)

- **Database Name**: `cantin`
- **Host**: `localhost:3306`
- **User**: `root`
- **Password**: *(empty)*

The complete database schema is saved in [schema.sql](schema.sql).

---

## 🚀 Running the Project

1. **In Apache NetBeans**:
   - Open NetBeans (`File` -> `Open Project...`).
   - Select `e:\uni\~ PROJECT\antigravity project` (or open as a Maven / Web Project).
   - Right-click the project -> **Run** (using Apache Tomcat 11).

2. **In Apache Tomcat 11**:
   - Web application URL: `http://localhost:8080/canteen/` or `http://localhost:8080/canteen/index.html`
