# La Virtual Zone Backend

## Manual Verification Steps for Transactions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   node server.js
   ```

3. Register a user and obtain a token:
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","email":"test@example.com","password":"pass","parsecId":"123"}'
   ```
   Save the `token` returned in the response.

4. Create a club for the user (required before making transactions):
   ```bash
   curl -X POST http://localhost:5000/api/club \
     -H "Content-Type: application/json" \
     -H "x-auth-token: YOUR_TOKEN" \
     -d '{"name":"My Club","color":"blue"}'
   ```

5. Create a transaction using the token:
   ```bash
   curl -X POST http://localhost:5000/api/transactions \
     -H "Content-Type: application/json" \
     -H "x-auth-token: YOUR_TOKEN" \
     -d '{"type":"compra","playerId":"PLAYER_ID","value":1000}'
   ```
   Replace `PLAYER_ID` with a valid player id from your database.

6. Verify the response contains the created transaction. You can list all transactions:
   ```bash
   curl -H "x-auth-token: YOUR_TOKEN" http://localhost:5000/api/transactions
   ```

These steps confirm that authentication middleware works with the transaction routes.
