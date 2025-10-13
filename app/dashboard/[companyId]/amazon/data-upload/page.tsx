"use client";

import type React from "react";
import { use, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  AlertCircle,
  FileText,
  Loader2,
  BarChart3,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function AmazonDataUploadPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isValidFile =
        selectedFile.type === "text/csv" ||
        selectedFile.name.endsWith(".csv") ||
        selectedFile.type === "text/plain";

      if (isValidFile) {
        setFile(selectedFile);
        setMessage(null);
      } else {
        setMessage({ type: "error", text: "CSV 파일만 업로드 가능합니다." });
      }
    }
  };

  // 비즈니스 리포트 업로드
  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("companyId", companyId);

      const response = await fetch("/api/amazon/upload-business-report", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "업로드에 실패했습니다.");
      }

      setMessage({
        type: "success",
        text:
          result.message ||
          `✅ 업로드 완료!\n📊 신규: ${result.insertedCount}개 | 업데이트: ${result.updatedCount}개`,
      });
      setFile(null);

      const fileInput = document.getElementById(
        "file-upload"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // 3초 후 메시지 자동 제거
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "업로드 중 오류가 발생했습니다.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href={`/dashboard/${companyId}`}>
                대시보드
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Amazon 데이터 업로드</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="max-w-2xl mx-auto w-full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Amazon 비즈니스 리포트 업로드
              </CardTitle>
              <CardDescription>
                Amazon Seller Central에서 다운로드한 비즈니스 리포트 CSV 파일을
                업로드하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 파일 업로드 */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">CSV 파일 선택</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </div>

              {/* 선택된 파일 정보 */}
              {file && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    <p className="text-sm font-medium">선택된 파일</p>
                  </div>
                  <p className="text-sm">
                    <strong>파일명:</strong> {file.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>크기:</strong> {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}

              {/* 메시지 */}
              {message && (
                <Alert
                  variant={message.type === "error" ? "destructive" : "default"}
                >
                  {message.type === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription className="whitespace-pre-line">
                    {message.text}
                  </AlertDescription>
                </Alert>
              )}

              {/* 업로드 버튼 */}
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full"
                size="lg"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  "업로드"
                )}
              </Button>

              {/* 포함되는 데이터 안내 */}
              <div className="text-xs text-muted-foreground space-y-2 pt-4 border-t">
                <p className="font-semibold">
                  📊 업로드하면 다음 데이터가 업데이트됩니다:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <strong>전체 판매 성과:</strong> 총 판매액, 주문 수, 배송
                    건수
                  </li>
                  <li>
                    <strong>주문당 비용:</strong> 주문당 평균 판매 금액
                  </li>
                  <li>
                    <strong>구매 전환율:</strong> 세션 대비 주문 전환율, Buy Box
                    비율
                  </li>
                  <li>
                    <strong>환불��:</strong> 환불 수량 및 환불률, 부정적 피드백
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  💡 동일한 날짜의 데이터가 있으면 자동으로 업데이트됩니다.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 추가 정보 카드 */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">
                업로드 후 확인할 수 있는 페이지
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center p-2 hover:bg-muted rounded">
                <span className="text-sm">전체 판매 성과</span>
                <a
                  href={`/dashboard/${companyId}/amazon/overview`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  바로가기 →
                </a>
              </div>
              <div className="flex justify-between items-center p-2 hover:bg-muted rounded">
                <span className="text-sm">주문당 비용</span>
                <a
                  href={`/dashboard/${companyId}/amazon/costs`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  바로가기 →
                </a>
              </div>
              <div className="flex justify-between items-center p-2 hover:bg-muted rounded">
                <span className="text-sm">구매 전환율</span>
                <a
                  href={`/dashboard/${companyId}/amazon/conversion`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  바로가기 →
                </a>
              </div>
              <div className="flex justify-between items-center p-2 hover:bg-muted rounded">
                <span className="text-sm">환불율</span>
                <a
                  href={`/dashboard/${companyId}/amazon/refund`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  바로가기 →
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
