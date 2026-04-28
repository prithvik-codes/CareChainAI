import sqlite3
conn = sqlite3.connect('healthvault.db')
cursor = conn.cursor()
cursor.execute('SELECT id, status, summary, file_path FROM reports ORDER BY id DESC LIMIT 5')
for row in cursor.fetchall():
    print(row)
conn.close()
