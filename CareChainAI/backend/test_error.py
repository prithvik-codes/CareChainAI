import sqlite3
conn = sqlite3.connect('healthvault.db')
cursor = conn.cursor()
cursor.execute('SELECT id, status, summary FROM reports ORDER BY id DESC LIMIT 1')
print(cursor.fetchone())
conn.close()
