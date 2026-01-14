Manual Setup (Tanpa Docker)
- Build Frontend:<br>
cd frontend<br>
npm install<br>
npm run build <br>
//Pastikan vite.config.js outputnya ke '../backend/static/react'
- Setup Backend:<br>
cd backend<br>
python -m venv venv<br>
source venv/bin/activate  # (Windows: venv\Scripts\activate)<br>
pip install -r requirements.txt<br>
python app.py