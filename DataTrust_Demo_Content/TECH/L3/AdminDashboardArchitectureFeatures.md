1. Dashboard Overview
The Borcella Admin Dashboard is the internal control plane for the e-commerce operation. It is accessible only to authenticated admin users and provides full CRUD capabilities for the platform's core entities, as well as business intelligence through real-time visualizations.

2. Admin Information Architecture

3. Feature Specifications
Overview / Dashboard Home
The home page displays four KPI summary cards (Total Revenue, Total Orders, Total Products, Total Customers) fetched server-side. Below these, a Recharts bar chart visualizes monthly sales revenue. Data is aggregated from the Orders collection using MongoDB's aggregation pipeline.

Collections Management
List view shows all collections with title, image thumbnail, and product count.

Create/Edit form includes title, description, and a single image upload via Cloudinary.

Delete is soft-checked — deleting a collection unlinks it from associated products but does not delete the products themselves.

Products Management
Full data table with columns: Image, Title, Category, Collections, Price, Expense (cost), and action buttons.

Product form supports: multi-image upload (up to 5 images via Cloudinary), comma-separated tags, multi-select sizes and colors.

Collection assignment is done via a searchable multi-select dropdown populated from the Collections API.

On save, the product is linked to all selected collections in a bidirectional reference update.

Orders Management
Orders are read-only in the dashboard (no manual order editing).

Order detail page shows: customer info (from Clerk), shipping address from Stripe, and line items with product name, size, color, quantity, and price.

Orders are created exclusively through the Stripe webhook flow.

Customer Management
Customer data is fetched from Clerk's API, not stored in MongoDB.

Each customer record displays their name, email, registration date, and a list of their associated orders.

Total spend per customer is calculated by joining Clerk user IDs against the Orders collection.

4. Data Table Component
All list views use a shared DataTable component built on TanStack Table v8 (via Shadcn UI). Features include: column sorting, pagination, column visibility toggle, and a global search filter.