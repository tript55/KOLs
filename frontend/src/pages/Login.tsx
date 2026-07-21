import { GithubOutlined, GoogleOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function Login() {
  const { user, signInWithGithub, signInWithGoogle } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen bg-paper-1 items-center justify-center font-body">
      <div className="bg-paper-2 p-10 rounded-[2.5rem] shadow-lg border border-border flex flex-col items-center max-w-md w-full">
        <Flex vertical align="center" gap="middle">
          <Title
            level={2}
            className="!mb-0 !font-display !tracking-tight"
            style={{ color: 'var(--color-accent)' }}
          >
            Crypto<span style={{ color: 'var(--color-ink-1)' }}>KOL</span>
          </Title>
          <Text type="secondary" className="text-center">
            Sign in to manage your automated content generation platform.
          </Text>

          <Flex vertical gap="middle" className="w-full mt-4">
            <Button
              type="primary"
              size="large"
              block
              icon={<GithubOutlined />}
              onClick={signInWithGithub}
              className="!rounded-2xl !font-bold !h-12"
            >
              Continue with GitHub
            </Button>
            <Button
              size="large"
              block
              icon={<GoogleOutlined />}
              onClick={signInWithGoogle}
              className="!rounded-2xl !font-bold !h-12 !border-2"
            >
              Continue with Google
            </Button>
          </Flex>
        </Flex>
      </div>
    </div>
  );
}
