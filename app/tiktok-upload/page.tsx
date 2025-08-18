'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react';
import { parseCSV, extractDateFromFile, validateTikTokAdsCSV } from '@/lib/csv-parser';

interface UploadResult {
  filename: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
  rowsInserted?: number;
  date?: string;
}

export default function TikTokUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'text/csv' || file.name.endsWith('.csv')
    );
    
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  }, []);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      const csvFiles = Array.from(selectedFiles).filter(
        file => file.type === 'text/csv' || file.name.endsWith('.csv')
      );
      setFiles(prev => [...prev, ...csvFiles]);
    }
  };

  // Remove file from list
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setUploadResults(prev => prev.filter((_, i) => i !== index));
  };

  // Validate and process CSV file
  const processCSVFile = (text: string, filename: string) => {
    const data = parseCSV(text);
    
    if (data.length === 0) {
      throw new Error('No data found in CSV file');
    }

    // Validate TikTok Ads CSV structure
    if (!validateTikTokAdsCSV(data)) {
      throw new Error('이 파일은 TikTok Ads CSV 파일이 아닌 것 같습니다. 필수 컬럼이 누락되었습니다.');
    }

    const date = extractDateFromFile(filename, data);
    
    return { data, date };
  };

  // Upload files to Supabase
  const uploadFiles = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    const results: UploadResult[] = [];

    for (const file of files) {
      const result: UploadResult = {
        filename: file.name,
        status: 'uploading'
      };
      
      results.push(result);
      setUploadResults([...results]);

      try {
        // Read and process file content
        const text = await file.text();
        const { data, date } = processCSVFile(text, file.name);
        
        result.date = date;

        // Upload to API
        const response = await fetch('/api/tiktok-ads-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: date,
            data: data
          })
        });

        const responseData = await response.json();

        if (response.ok) {
          result.status = 'success';
          result.message = responseData.message;
          result.rowsInserted = responseData.rowsInserted;
        } else {
          result.status = 'error';
          result.message = responseData.error || 'Upload failed';
        }
      } catch (error) {
        result.status = 'error';
        result.message = error instanceof Error ? error.message : 'Unknown error';
      }

      setUploadResults([...results]);
    }

    setIsUploading(false);
  };

  // Clear all files
  const clearAll = () => {
    setFiles([]);
    setUploadResults([]);
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">TikTok Ads CSV Upload</CardTitle>
          <p className="text-muted-foreground">
            다운로드한 TikTok Ads CSV 파일을 Supabase gmv_data 테이블에 업로드합니다
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium mb-2">
              CSV 파일을 드래그하여 놓거나 클릭하여 선택하세요
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              TikTok Ads에서 다운로드한 CSV 파일만 지원됩니다
            </p>
            <input
              type="file"
              multiple
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input">
              <Button variant="outline" className="cursor-pointer" asChild>
                <span>파일 선택</span>
              </Button>
            </label>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">선택된 파일 ({files.length}개)</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  disabled={isUploading}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  모두 삭제
                </Button>
              </div>
              {files.map((file, index) => {
                const result = uploadResults[index];
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024).toFixed(2)} KB
                          {result?.date && ` • Date: ${result.date}`}
                        </p>
                        {result?.message && (
                          <p className={`text-sm ${
                            result.status === 'error' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {result.message}
                            {result.rowsInserted && ` (${result.rowsInserted} rows)`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {result?.status === 'uploading' && (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      )}
                      {result?.status === 'success' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {result?.status === 'error' && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      {!isUploading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Upload Button */}
          {files.length > 0 && (
            <div className="flex justify-end">
              <Button
                onClick={uploadFiles}
                disabled={isUploading}
                className="min-w-[150px]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Supabase에 업로드
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Success Alert */}
          {uploadResults.filter(r => r.status === 'success').length > 0 && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {uploadResults.filter(r => r.status === 'success').length}개 파일이 
                성공적으로 업로드되었습니다!
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">사용 방법:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>TikTok Ads Manager에서 데이터를 CSV로 다운로드</li>
              <li>다운로드한 CSV 파일을 위 영역에 드래그 앤 드롭</li>
              <li>"Supabase에 업로드" 버튼 클릭</li>
              <li>데이터가 gmv_data 테이블에 저장됩니다</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}