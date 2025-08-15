# 🍺 Beer Game Simulator (멀티플레이어)

MIT의 Beer Distribution Game을 기반으로 한 공급망 관리 교육용 시뮬레이션 게임입니다.

## 📝 게임 소개

Beer Game은 공급망 관리에서 발생하는 **불휩 효과(Bullwhip Effect)**를 체험하고 학습할 수 있는 교육용 게임입니다. 4명의 플레이어가 각각 소매상, 도매상, 유통업체, 공장 역할을 맡아 맥주 공급망을 관리합니다.

### 주요 특징
- 🎮 실시간 멀티플레이어 (4인)
- 📊 실시간 재고 및 비용 추적
- 📈 불휩 효과 시각화
- 🎯 다양한 수요 패턴 시뮬레이션

## 🎯 학습 목표

- 공급망 관리의 복잡성 이해
- 정보 공유의 중요성 인식
- 불휩 효과의 원인과 결과 체험
- 재고 관리 전략 학습

## 🚀 설치 및 실행

### 필요 사항
- Node.js 16+ 
- npm 또는 yarn

### 로컬 실행

1. 저장소 클론
```bash
git clone https://github.com/yourusername/beer-game-simulator.git
cd beer-game-simulator
```

2. 의존성 설치
```bash
# 프론트엔드
npm install

# 백엔드
cd server
npm install
```

3. 환경 변수 설정
```bash
# 루트 디렉토리에 .env 파일 생성
REACT_APP_SERVER_URL=http://localhost:3001

# server 디렉토리에 .env 파일 생성
PORT=3001
CLIENT_URL=http://localhost:3000
```

4. 실행
```bash
# 터미널 1: 백엔드 서버
cd server
npm start

# 터미널 2: 프론트엔드
npm start
```

5. 브라우저에서 http://localhost:3000 접속

## 🎮 게임 방법

### 1. 게임 생성
- 한 명이 "새 게임 생성하기" 클릭
- 게임 설정 조정 (라운드 수, 수요 패턴 등)
- 게임 ID 공유

### 2. 게임 참가
- 다른 플레이어들이 게임 ID로 참가
- 각자 역할 선택 (소매상/도매상/유통업체/공장)
- 4명 모두 참가 완료 시 관리자가 게임 시작

### 3. 게임 진행
- 매 라운드마다 상류 업체에 주문
- 2주 후 주문한 상품 도착
- 재고 비용과 품절 비용 최소화 목표

### 4. 게임 종료
- 설정된 라운드 완료 시 자동 종료
- 최종 비용 및 불휩 효과 분석
- 학습 포인트 확인

## 📊 게임 규칙

- **초기 재고**: 각 12개
- **배송 지연**: 2주
- **재고 비용**: $0.50/개/주
- **품절 비용**: $1.00/개/주
- **정보 제한**: 직접 연결된 파트너의 주문만 확인 가능

## 🛠 기술 스택

### Frontend
- React 18
- TypeScript
- Material-UI
- Recharts
- Socket.IO Client

### Backend
- Node.js
- Express
- Socket.IO

## 📄 라이선스

MIT License
