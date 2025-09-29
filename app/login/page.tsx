import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f3f4f6'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '32px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: '#111827'
        }}>
          로그인
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '32px'
        }}>
          이메일과 비밀번호를 입력하세요
        </p>

        <LoginForm />
      </div>
    </div>
  )
}