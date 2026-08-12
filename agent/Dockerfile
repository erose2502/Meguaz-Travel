FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Pre-download model weights (Silero VAD) so cold starts stay fast
RUN python main.py download-files

CMD ["python", "main.py", "start"]
