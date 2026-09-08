// ============================================================
//  자습용 퀴즈 서버 - 학생 혼자 풀이 + 교수자 제출 확인
//  결과를 results.json 파일에 저장 (서버 재시작해도 유지)
// ============================================================
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'results.json');

// 교수자 확인 페이지 비밀번호 (원하면 바꾸세요)
const TEACHER_CODE = process.env.TEACHER_CODE || 'teacher';

function loadResults() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}
function saveResults(list) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2)); }
  catch (e) { console.error('저장 실패:', e.message); }
}

// 학생: 결과 제출
app.post('/api/submit', (req, res) => {
  const { name, sid, score, correct, total } = req.body || {};
  if (!name || !sid) return res.status(400).json({ ok: false });
  const list = loadResults();
  // 같은 학번이면 최고점만 갱신 (여러 번 풀어도 최고 기록 유지)
  const key = String(sid).trim();
  const existing = list.find((r) => String(r.sid).trim() === key);
  const record = {
    name: String(name).trim().slice(0, 20),
    sid: key.slice(0, 20),
    score: Number(score) || 0,
    correct: Number(correct) || 0,
    total: Number(total) || 0,
    attempts: 1,
    at: new Date().toISOString(),
  };
  if (existing) {
    record.attempts = (existing.attempts || 1) + 1;
    // 최고점 유지
    if (existing.score >= record.score) {
      record.score = existing.score;
      record.correct = existing.correct;
    }
    Object.assign(existing, record);
  } else {
    list.push(record);
  }
  saveResults(list);
  res.json({ ok: true });
});

// 교수자: 결과 조회 (비밀번호 필요)
app.get('/api/results', (req, res) => {
  if (req.query.code !== TEACHER_CODE) return res.status(401).json({ ok: false, error: '비밀번호가 틀렸어요.' });
  const list = loadResults().sort((a, b) => new Date(b.at) - new Date(a.at));
  res.json({ ok: true, results: list });
});

// 교수자: 기록 전체 삭제 (새 학기/새 시험용)
app.post('/api/reset', (req, res) => {
  if ((req.body && req.body.code) !== TEACHER_CODE) return res.status(401).json({ ok: false });
  saveResults([]);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log('  자습 퀴즈 서버 실행 : http://localhost:' + PORT + '/'));
