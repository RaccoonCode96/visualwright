import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from 'react-monaco-editor';
import { io } from 'socket.io-client'; // socket.io-client 임포트

interface TestResult {
  title: string;
  status: string;
  duration: number;
  errors?: any[];
}

interface PlaywrightRunResult {
  status: string;
  startTime: string;
  endTime: string;
  duration: number;
  testResults: TestResult[];
  errors: any[];
}

const PlaywrightTestRunner: React.FC = () => {
  const [testFiles, setTestFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<PlaywrightRunResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeLogs, setRealtimeLogs] = useState<string[]>([]); // 실시간 로그 상태
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null); // 현재 스크린샷 상태

  const backendUrl = 'http://localhost:3000'; // 백엔드 HTTP URL
  const websocketUrl = 'http://localhost:3000'; // 백엔드 WebSocket URL (HTTP와 동일할 수 있음)

  useEffect(() => {
    fetchTestFiles();

    // WebSocket 연결
    const socket = io(websocketUrl);

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setRealtimeLogs(prev => [...prev, 'Connected to WebSocket server']);
    });

    socket.on('testLog', (data: { type: string; log: string }) => {
      setRealtimeLogs(prev => [...prev, `${data.type}: ${data.log}`]);
    });

    socket.on('screenshotFrame', (data: { image: string }) => {
      setCurrentScreenshot(`data:image/png;base64,${data.image}`);
    });

    socket.on('testResult', (data: any) => {
      console.log('Received final test result via WebSocket:', data);
      // Playwright JSON 리포터 출력을 PlaywrightRunResult 인터페이스에 맞게 변환
      const transformedResult: PlaywrightRunResult = {
        status: data.stats.unexpected === 0 && data.stats.expected > 0 ? 'passed' : 'failed',
        startTime: data.stats.startTime,
        endTime: new Date(new Date(data.stats.startTime).getTime() + data.stats.duration).toISOString(),
        duration: data.stats.duration,
        testResults: [],
        errors: data.errors || [],
      };

      data.suites.forEach((suite: any) => {
        suite.specs.forEach((spec: any) => {
          spec.tests.forEach((test: any) => {
            test.results.forEach((result: any) => {
              transformedResult.testResults.push({
                title: spec.title,
                status: result.status,
                duration: result.duration,
                errors: result.errors || [],
              });
            });
          });
        });
      });
      setRunResult(transformedResult);
      setLoading(false); // 테스트 완료 시 로딩 상태 해제
      setCurrentScreenshot(null); // 테스트 완료 시 스크린샷 초기화
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setRealtimeLogs(prev => [...prev, 'Disconnected from WebSocket server']);
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      setRealtimeLogs(prev => [...prev, `WebSocket connection error: ${err.message}`]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchTestFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${backendUrl}/playwright/tests`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTestFiles(data);
    } catch (err: any) {
      setError(`Failed to fetch test files: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchFileContent = async (fileName: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${backendUrl}/playwright/tests/${fileName}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      setFileContent(text);
      setSelectedFile(fileName);
    } catch (err: any) {
      setError(`Failed to fetch file content: ${err.message}`);
      setFileContent(null);
    } finally {
      setLoading(false);
    }
  };

  const runTest = async (fileName: string) => {
    setLoading(true);
    setError(null);
    setRunResult(null);
    setRealtimeLogs([]); // 새 테스트 실행 시 로그 초기화
    setCurrentScreenshot(null); // 새 테스트 실행 시 스크린샷 초기화
    try {
      // HTTP 요청은 테스트 실행을 트리거하는 역할만 함
      const response = await fetch(`${backendUrl}/playwright/run/${fileName}`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // 실제 결과는 WebSocket을 통해 수신될 것임
      setRealtimeLogs(prev => [...prev, `Triggered test run for ${fileName}. Waiting for real-time logs and screenshots...`]);
    } catch (err: any) {
      setError(`Failed to trigger test run: ${err.message}`);
      setLoading(false);
    }
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // 에디터가 마운트된 후 추가적인 설정이 필요하면 여기에 작성
  };

  const handleEditorChange = (newValue: string, e: any) => {
    // 파일 내용이 변경될 때마다 상태 업데이트 (저장 기능 구현 시 활용)
    setFileContent(newValue);
  };

  const editorOptions = {
    selectOnLineNumbers: true,
    readOnly: false, // 편집 가능하도록 설정
    minimap: { enabled: false },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Playwright Test Runner</h1>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <div style={{ display: 'flex', marginBottom: '20px' }}>
        <div style={{ flex: 1, marginRight: '20px', border: '1px solid #ccc', padding: '10px' }}>
          <h2>Test Files</h2>
          <ul>
            {testFiles.length > 0 ? (
              testFiles.map((file) => (
                <li key={file} style={{ cursor: 'pointer', textDecoration: selectedFile === file ? 'underline' : 'none' }} onClick={() => fetchFileContent(file)}>
                  {file}
                </li>
              ))
            ) : (
              <p>No test files found.</p>
            )}
          </ul>
        </div>

        <div style={{ flex: 2, border: '1px solid #ccc', padding: '10px' }}>
          <h2>File Content: {selectedFile || 'None selected'}</h2>
          {fileContent !== null ? (
            <MonacoEditor
              width="100%"
              height="400"
              language="typescript"
              theme="vs-light"
              value={fileContent}
              options={editorOptions}
              onChange={handleEditorChange}
              editorDidMount={handleEditorDidMount}
            />
          ) : (
            <p>Select a file to view its content.</p>
          )}
          {selectedFile && (
            <button onClick={() => runTest(selectedFile)} style={{ marginTop: '10px', padding: '8px 15px', cursor: 'pointer' }}>
              Run Test
            </button>
          )}
        </div>
      </div>

      {/* 실시간 스크린샷 표시 영역 */}
      <div style={{ border: '1px solid #ccc', padding: '10px', marginTop: '20px' }}>
        <h2>Live View</h2>
        {currentScreenshot ? (
          <img src={currentScreenshot} alt="Live Test View" style={{ width: '100%', border: '1px solid #ddd' }} />
        ) : (
          <p>No live view available. Run a test to see the live screen.</p>
        )}
      </div>

      {/* 실시간 로그 표시 영역 */}
      <div style={{ border: '1px solid #ccc', padding: '10px', marginTop: '20px' }}>
        <h2>Real-time Test Logs</h2>
        <div style={{ maxHeight: '300px', overflowY: 'auto', background: '#333', color: '#eee', padding: '10px', fontSize: '0.9em' }}>
          {realtimeLogs.length > 0 ? (
            realtimeLogs.map((log, index) => (
              <p key={index} style={{ margin: '0' }}>{log}</p>
            ))
          ) : (
            <p>No logs yet. Run a test to see real-time output.</p>
          )}
        </div>
      </div>

      {runResult && (
        <div style={{ border: '1px solid #ccc', padding: '10px', marginTop: '20px' }}>
          <h2>Test Run Result (Final)</h2>
          <p>Status: {runResult.status}</p>
          <p>Duration: {runResult.duration}ms</p>
          <h3>Test Results:</h3>
          {runResult.testResults.length > 0 ? (
            <ul>
              {runResult.testResults.map((result, index) => (
                <li key={index} style={{ color: result.status === 'passed' ? 'green' : 'red' }}>
                  {result.title}: {result.status} ({result.duration}ms)
                  {result.errors && result.errors.length > 0 && (
                    <pre style={{ color: 'red', fontSize: '0.8em', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {JSON.stringify(result.errors, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No test results available.</p>
          )}
          {runResult.errors && runResult.errors.length > 0 && (
            <div>
              <h3>Errors:</h3>
              <pre style={{ color: 'red', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(runResult.errors, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlaywrightTestRunner;
