'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Link,
  RefreshCw,
  Bell,
  Database,
  Shield,
  Globe,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { amazonAPIStatus } from '@/lib/mock-data/amazon-mock-data';

export default function AmazonSettingsPage() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notifications, setNotifications] = useState({
    orderAlerts: true,
    inventoryAlerts: true,
    returnAlerts: false,
    performanceReports: true
  });
  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    syncInterval: '1hour',
    includeArchived: false
  });

  const handleConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
    }, 2000);
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 3000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Amazon 설정</h1>
          <p className="text-muted-foreground">API 연동 및 동기화 설정 관리</p>
        </div>
        <Button onClick={handleManualSync} disabled={isSyncing} variant="outline">
          {isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              동기화 중...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              수동 동기화
            </>
          )}
        </Button>
      </div>

      {/* API Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            API 연동 상태
          </CardTitle>
          <CardDescription>Amazon Selling Partner API 연동 상태</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${amazonAPIStatus.status === 'Connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <div>
                <p className="font-medium">{amazonAPIStatus.status === 'Connected' ? 'API 연동됨' : 'API 미연동'}</p>
                <p className="text-sm text-muted-foreground">
                  마지막 동기화: {new Date(amazonAPIStatus.lastSync).toLocaleString('ko-KR')}
                </p>
              </div>
            </div>
            {amazonAPIStatus.status === 'Connected' ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                정상
              </Badge>
            ) : (
              <Button onClick={handleConnect} disabled={isConnecting} size="sm">
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    연동 중...
                  </>
                ) : (
                  '연동하기'
                )}
              </Button>
            )}
          </div>

          {/* API Endpoints Status */}
          <div>
            <h3 className="text-sm font-medium mb-3">API 엔드포인트 상태</h3>
            <div className="space-y-2">
              {amazonAPIStatus.endpoints.map((endpoint, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${endpoint.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm">{endpoint.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{endpoint.lastCall}</span>
                </div>
              ))}
            </div>
          </div>

          {/* API Limits */}
          <div>
            <h3 className="text-sm font-medium mb-3">API 사용량</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>일일 제한</span>
                  <span className="font-medium">
                    {amazonAPIStatus.limits.daily.used} / {amazonAPIStatus.limits.daily.limit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${amazonAPIStatus.limits.daily.percentage}%` }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>시간당 제한</span>
                  <span className="font-medium">
                    {amazonAPIStatus.limits.hourly.used} / {amazonAPIStatus.limits.hourly.limit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${amazonAPIStatus.limits.hourly.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>설정</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sync">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="sync">동기화</TabsTrigger>
              <TabsTrigger value="notifications">알림</TabsTrigger>
              <TabsTrigger value="marketplace">마켓플레이스</TabsTrigger>
              <TabsTrigger value="advanced">고급</TabsTrigger>
            </TabsList>

            <TabsContent value="sync" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-sync">자동 동기화</Label>
                    <p className="text-sm text-muted-foreground">
                      설정된 간격으로 자동으로 데이터를 동기화합니다
                    </p>
                  </div>
                  <Switch
                    id="auto-sync"
                    checked={syncSettings.autoSync}
                    onCheckedChange={(checked) => setSyncSettings({ ...syncSettings, autoSync: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sync-interval">동기화 간격</Label>
                  <Select
                    value={syncSettings.syncInterval}
                    onValueChange={(value) => setSyncSettings({ ...syncSettings, syncInterval: value })}
                  >
                    <SelectTrigger id="sync-interval">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15min">15분마다</SelectItem>
                      <SelectItem value="30min">30분마다</SelectItem>
                      <SelectItem value="1hour">1시간마다</SelectItem>
                      <SelectItem value="3hours">3시간마다</SelectItem>
                      <SelectItem value="6hours">6시간마다</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="include-archived">보관된 주문 포함</Label>
                    <p className="text-sm text-muted-foreground">
                      동기화 시 보관된 주문도 포함합니다
                    </p>
                  </div>
                  <Switch
                    id="include-archived"
                    checked={syncSettings.includeArchived}
                    onCheckedChange={(checked) => setSyncSettings({ ...syncSettings, includeArchived: checked })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="order-alerts">주문 알림</Label>
                    <p className="text-sm text-muted-foreground">
                      새로운 주문이 들어올 때 알림을 받습니다
                    </p>
                  </div>
                  <Switch
                    id="order-alerts"
                    checked={notifications.orderAlerts}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, orderAlerts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="inventory-alerts">재고 부족 알림</Label>
                    <p className="text-sm text-muted-foreground">
                      재고가 설정한 수준 이하로 떨어질 때 알림을 받습니다
                    </p>
                  </div>
                  <Switch
                    id="inventory-alerts"
                    checked={notifications.inventoryAlerts}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, inventoryAlerts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="return-alerts">반품 알림</Label>
                    <p className="text-sm text-muted-foreground">
                      반품 요청이 발생할 때 알림을 받습니다
                    </p>
                  </div>
                  <Switch
                    id="return-alerts"
                    checked={notifications.returnAlerts}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, returnAlerts: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="performance-reports">성과 리포트</Label>
                    <p className="text-sm text-muted-foreground">
                      주간/월간 성과 리포트를 받습니다
                    </p>
                  </div>
                  <Switch
                    id="performance-reports"
                    checked={notifications.performanceReports}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, performanceReports: checked })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="marketplace" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>활성 마켓플레이스</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-3 border rounded-lg">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm">미국 (US)</span>
                      <Badge variant="default" className="ml-auto">활성</Badge>
                    </div>
                    <div className="flex items-center gap-2 p-3 border rounded-lg">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm">캐나다 (CA)</span>
                      <Badge variant="secondary" className="ml-auto">비활성</Badge>
                    </div>
                    <div className="flex items-center gap-2 p-3 border rounded-lg">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm">멕시코 (MX)</span>
                      <Badge variant="secondary" className="ml-auto">비활성</Badge>
                    </div>
                    <div className="flex items-center gap-2 p-3 border rounded-lg">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm">영국 (UK)</span>
                      <Badge variant="secondary" className="ml-auto">비활성</Badge>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    추가 마켓플레이스를 활성화하려면 Amazon Seller Central에서 권한을 부여해야 합니다.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seller-id">Seller ID</Label>
                  <Input id="seller-id" value="A2EUQ1WTGCTBG2" disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mws-auth-token">MWS Auth Token</Label>
                  <Input id="mws-auth-token" type="password" value="amzn1.application-oa2-client.example" disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="refresh-token">Refresh Token</Label>
                  <Input id="refresh-token" type="password" value="Atzr|IwEBIC...example" disabled />
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    보안을 위해 토큰 정보는 암호화되어 저장됩니다. 토큰을 재발급하려면 Amazon Seller Central에서 앱 권한을 재설정하세요.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button variant="outline">토큰 재발급</Button>
                  <Button variant="destructive" disabled>연동 해제</Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button>설정 저장</Button>
      </div>
    </div>
  );
}