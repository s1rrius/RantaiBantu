from flask import Flask, send_from_directory
import os

app = Flask(__name__)
# Use the directory where this script is located
FRONTEND_DIR = os.path.abspath(os.path.dirname(__file__))

@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(FRONTEND_DIR, path)

if __name__ == '__main__':
    print(f"Serving frontend from: {FRONTEND_DIR}")
    print("Go to: http://127.0.0.1:5000")
    app.run(port=5000, debug=True)
