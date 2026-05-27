import sqlite3

conn = sqlite3.connect('blockchain.db')
c = conn.cursor()

def print_table(name, query):
    print(f"--- {name} ---")
    c.execute(query)
    cols = [desc[0] for desc in c.description]
    print(cols)
    for row in c.fetchall():
        print(row)
    print()

print_table("USERS", "SELECT username, role, town_id FROM users")
print_table("TRANSACTIONS", "SELECT id, amount, required_validators, status FROM transactions")
print_table("SIGNATURES", "SELECT * FROM signatures")
print_table("BLOCKS", "SELECT * FROM blocks")

conn.close()
