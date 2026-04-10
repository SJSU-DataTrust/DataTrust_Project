1. Introduction
Borcella is a full-stack, production-grade E-Commerce platform built on a modern JAMStack-inspired architecture. The platform consists of two tightly integrated applications: a customer-facing storefront and an internal admin dashboard, both rendered by the same Next.js 14 monorepo located in the borcella_admin directory.

The system is designed for scalability, developer ergonomics, and operational simplicity. All server logic is handled through Next.js API Routes and React Server Components, eliminating the need for a separate backend server in the MVP. MongoDB Atlas serves as the primary data store, accessed via Mongoose ODM.

Architectural Principle:     

Borcella is a monorepo single-deployment application. Both the storefront and admin panel are served from the same Next.js process, distinguished by route groups and middleware-level role checks.      

2. Tech Stack Summary

3. High-Level Architecture Diagram

     Figure 1 - Borcella High-Level System Architecture       

4. Module Overview
 

Storefront 

Product listing, search, product detail, cart, wishlist, and Stripe-powered checkout flow for end customers.        

 

Admin Dashboard        

CRUD management for collections, products, orders, and customers. Includes Recharts-powered analytics.        

 

Authentication
Clerk-managed user sessions with middleware-level route protection. Separate flows for customers and admins.
       

Payment Engine        

Stripe Checkout Sessions with webhook-driven order creation in MongoDB. Supports test and live mode.        

Media Pipeline 

Cloudinary integration via Next Cloudinary for image uploads, transformation, and CDN delivery.        

 

Analytics
Recharts-based dashboard visualizations showing revenue, top products, and customer metrics.
       

5. Request Data Flow
The following describes the lifecycle of a typical end-user purchase:

User browses the storefront — Next.js renders the Product List page as a React Server Component, fetching data directly from MongoDB via Mongoose.

User adds items to cart — cart state is managed client-side in React state (or localStorage).

User initiates checkout — a call to POST /api/checkout creates a Stripe Checkout Session and redirects the browser to Stripe's hosted checkout page.

Payment is completed — Stripe sends a checkout.session.completed webhook event to POST /api/webhooks/stripe.

Webhook handler verifies the Stripe signature, extracts order data, and persists a new Order document in MongoDB.

Admin can view the new order instantly in the dashboard without any additional sync step.



6. Appendix
Nidhi

Dharmesh

Megh

Thanuja