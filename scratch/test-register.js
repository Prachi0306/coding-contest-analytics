const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/register', {
      email: 'test_bad_pw@gmail.com',
      username: 'test_bad_pw',
      password: '.........',
      confirmPassword: '.........'
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error response status:', err.response?.status);
    console.error('Error response data:', err.response?.data);
    console.error('Error message:', err.message);
  }
}

test();
