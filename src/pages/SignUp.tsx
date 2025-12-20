import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Card, Form, Input, Button, Typography, Divider, App } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, GoogleOutlined } from '@ant-design/icons';
import { signUpWithEmail, signInWithGoogle } from '../services/firebaseAuth';
import { setUser } from '../store/slices/authSlice';
import wgysLogo from '../assets/wgys-logo-small.png';
import './auth-override.css';

const { Title, Text } = Typography;

export default function SignUp() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [form] = Form.useForm();

  const handleEmailSignUp = async (values: { displayName: string; email: string; password: string; confirmPassword: string }) => {
    setLoading(true);

    try {
      const user = await signUpWithEmail(values.email, values.password, values.displayName);
      dispatch(setUser({ user }));
      navigate('/dashboard');
    } catch (err: any) {
      message.error({ content: err.message || 'Failed to create account' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);

    try {
      const user = await signInWithGoogle();
      dispatch(setUser({ user }));
      navigate('/dashboard');
    } catch (err: any) {
      message.error({ content: err.message || 'Failed to sign up with Google' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Card 
        style={{ width: 400, maxWidth: '100%' }}
        variant="borderless"
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img 
            src={wgysLogo} 
            alt="WGYS Logo" 
            style={{ width: 80, height: 80, marginBottom: 16 }}
          />
          <Title 
            level={2} 
            style={{ 
              margin: 0, 
              fontFamily: 'Impact, "Arial Black", sans-serif',
              fontWeight: 900,
              letterSpacing: '1px'
            }}
          >
            WEST GEORGIA YOUTH SPORTS, INC.
          </Title>
          <Title level={3} style={{ margin: '8px 0 0 0' }}>Create Account</Title>
          <Text type="secondary">Join West Georgia Youth Sports</Text>
        </div>

        <Form
          form={form}
          onFinish={handleEmailSignUp}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="displayName"
            rules={[{ required: true, message: 'Please enter your full name' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Full name"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Email address"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: 'Please enter your password' },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              disabled={loading}
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm password"
              disabled={loading}
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
            >
              Create Account
            </Button>
          </Form.Item>
        </Form>

        <Divider>OR</Divider>

        <Button
          icon={<GoogleOutlined />}
          onClick={handleGoogleSignUp}
          block
          loading={loading}
        >
          Sign up with Google
        </Button>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text type="secondary">
            Already have an account? <Link to="/signin">Sign in</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}
