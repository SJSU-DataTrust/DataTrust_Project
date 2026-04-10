1. API Architecture Overview
Borcella's backend is implemented entirely as Next.js API Routes (app/api/) — there is no separate Express, Fastify, or other backend server. Each route file exports HTTP method handlers (GET, POST, PUT, DELETE) as named async functions.

Endpoint

Methods

Description

Auth Required

/api/collections

GET, POST

List / create product collections

Admin only

/api/collections/[id]

GET, PUT, DELETE

Single collection operations

Admin only

/api/products

GET, POST

List / create products

Admin (write), Public (read)

/api/products/[id]

GET, PUT, DELETE

Single product operations

Admin (write), Public (read)

/api/orders

GET

List all orders

Admin only

/api/orders/[id]

GET

Order detail

Admin / Order Owner

/api/customers

GET

List customers (from Clerk)

Admin only

/api/checkout

POST

Create Stripe Checkout Session

Authenticated

/api/webhooks/stripe

POST

Handle Stripe payment events

Stripe signature

/api/search/[query]

GET

Full-text product search

Public

2. MongoDB Data Model Diagram

3. Database Connection Management
To avoid exhausting MongoDB connections in a serverless environment (Vercel), Borcella uses a connection caching pattern. The connection is established once and cached on the global object across hot-reloads in development and invocations in production.



// lib/mongoDB.ts
import mongoose from "mongoose";
let isConnected = false;
const connectToDB = async () => {
  if (isConnected) return;
  mongoose.set("strictQuery", true);
  await mongoose.connect(process.env.MONGODB_URL!, { dbName: "borcella" });
  isConnected = true;
};
export default connectToDB;
  Environment Variable Required:       

MONGODB_URL must be set in .env.local (development) and as a Vercel Environment Variable in production. The connection string must include the cluster hostname and authentication credentials.      

4. Mongoose Models
Model File

Collection Name

Key Fields

Model File

Collection Name

Key Fields

lib/models/Collection.ts

collections

title, description, image, products[]

lib/models/Product.ts

products

title, media[], price, sizes[], colors[], collections[]

lib/models/Order.ts

orders

customerId, products[] (nested OrderItem), totalAmount

5. Server Actions vs API Routes
The codebase uses a hybrid approach. API Routes handle data that must be accessible from the browser (Stripe webhook, client-side cart actions). Server Actions in lib/actions/ are used for data-fetching within React Server Components to avoid an unnecessary HTTP round-trip.