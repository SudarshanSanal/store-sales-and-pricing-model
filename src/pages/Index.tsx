import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardSidebar, Tab } from '@/components/dashboard/DashboardSidebar';
import { StatCard } from '@/components/dashboard/StatCard';
import { ModelComparison } from '@/components/dashboard/ModelComparison';
import { SeasonalTrends } from '@/components/dashboard/SeasonalTrends';
import { InventoryAlerts } from '@/components/dashboard/InventoryAlerts';
import { InventoryManagement } from '@/components/dashboard/InventoryManagement';
import { DynamicPricing } from '@/components/dashboard/DynamicPricing';
import { DataUpload } from '@/components/dashboard/DataUpload';
import { UploadedForecastChart } from '@/components/dashboard/UploadedForecastChart';
import { EmptyForecastState } from '@/components/dashboard/EmptyForecastState';
import { RecentActivityTimeline } from '@/components/dashboard/RecentActivityTimeline';
import { ForecastAccuracyReport } from '@/components/dashboard/ForecastAccuracyReport';
import { BoardReportGenerator } from '@/components/dashboard/BoardReportGenerator';
import { MyDatasets } from '@/components/dashboard/MyDatasets';
import { CombineDatasets } from '@/components/dashboard/CombineDatasets';
import { Profile } from '@/components/dashboard/Profile';
import { ReportsView } from '@/components/dashboard/ReportsView';
import { NotificationsDropdown } from '@/components/dashboard/NotificationsDropdown';
import { ThemeToggle } from '@/components/ThemeToggle';
import { EmailVerificationScreen } from '@/components/auth/EmailVerificationScreen';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { GenAIAssistant } from '@/components/GenAIAssistant';
import { useForecast, deriveKpis, fetchForecastForDataset, forecastStore } from '@/lib/forecastStore';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, Target, Package, AlertTriangle, Clock, GitBranch, Menu, Upload, Database, Loader2, MailWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const TAB_TITLES: Record<Tab, { title: string; subtitle: string }> = {
  overview: { title: 'Dashboard Overview', subtitle: 'KPIs, forecasts and alerts at a glance' },
  data: { title: 'Data Upload & Training', subtitle: 'Drop a CSV, map columns, train the hybrid model' },
  forecast: { title: 'Sales Forecasting', subtitle: 'Per-product hybrid XGBoost–LSTM projections' },
  models: { title: 'Model Analytics', subtitle: 'Compare XGBoost, LSTM and hybrid accuracy' },
  accuracy: { title: 'Forecast Accuracy Report', subtitle: 'Actual vs predicted with per-product error breakdown' },
  inventory: { title: 'Inventory Management', subtitle: 'ROP, EOQ and safety-stock recommendations' },
  pricing: { title: 'Dynamic Pricing', subtitle: 'Elasticity-based revenue optimisation' },
  reports: { title: 'Sales Forecast Reports', subtitle: 'Executive PDF generation, downloads and email dispatch' },
  datasets: { title: 'My Datasets', subtitle: 'View, manage and delete your saved datasets' },
  combine: { title: 'Combine Datasets', subtitle: 'Merge multiple datasets into one' },
  profile: { title: 'Profile & Settings', subtitle: 'Account information and security' },
};

const Index = () => {
  const { session, user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as Tab | null;
  const urlDatasetId = searchParams.get('datasetId');

  const [activeTab, setActiveTabState] = useState<Tab>(urlTab || 'data');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(urlDatasetId || null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [loadedDataset, setLoadedDataset] = useState<{
    csvData: string;
    mapping: Record<string, string>;
    name: string;
    id?: string;
  } | null>(null);

  const uploadedForecast = useForecast();
  const kpis = deriveKpis(uploadedForecast);

  const handleTabChange = (newTab: Tab, newDatasetId?: string | null) => {
    setActiveTabState(newTab);
    const targetDatasetId = newDatasetId !== undefined ? newDatasetId : selectedDatasetId;
    if (newDatasetId !== undefined) {
      setSelectedDatasetId(newDatasetId);
    }
    const params: Record<string, string> = { tab: newTab };
    if (targetDatasetId) {
      params.datasetId = targetDatasetId;
    }
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTabState(urlTab);
    }
  }, [urlTab, activeTab]);

  // Sync dataset forecast on urlDatasetId change or initial page load/refresh (F5)
  useEffect(() => {
    const dsId = urlDatasetId || selectedDatasetId;
    if (dsId && session?.token) {
      if (uploadedForecast?.datasetId !== dsId) {
        fetchForecastForDataset(dsId, session.token).then(fc => {
          if (fc) {
            forecastStore.set(fc);
          } else {
            forecastStore.set(null);
          }
        });
      }
    }
  }, [urlDatasetId, selectedDatasetId, session?.token, uploadedForecast?.datasetId]);

  const loadDatasetForTraining = async (datasetIdToLoad: string) => {
    if (!session?.token) return;
    try {
      const res = await fetch(`/api/datasets/${datasetIdToLoad}`, {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoadedDataset({
          csvData: data.csvData,
          mapping: data.columnMapping || {},
          name: data.name,
          id: datasetIdToLoad,
        });
        handleTabChange('data', datasetIdToLoad);
      }
    } catch {
      // silent
    }
  };

  // Auth loading spinner
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-mono">Loading session…</p>
        </div>
      </div>
    );
  }

  // Auth gate: show login/register if not authenticated
  if (!session) {
    return <AuthScreen />;
  }

  if (showVerificationModal) {
    return <EmailVerificationScreen onSuccess={() => setShowVerificationModal(false)} />;
  }

  const goToUpload = () => handleTabChange('data');
  const meta = TAB_TITLES[activeTab];
  const datasetLabel = uploadedForecast
    ? `${uploadedForecast.products.length} product${uploadedForecast.products.length === 1 ? '' : 's'} · ${uploadedForecast.horizonDays}d horizon`
    : null;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <DashboardSidebar
          activeTab={activeTab}
          onTabChange={(t) => handleTabChange(t)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </div>

      {/* Mobile sidebar (sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-60 bg-sidebar border-sidebar-border">
          <DashboardSidebar activeTab={activeTab} onTabChange={(t) => handleTabChange(t)} />
        </SheetContent>
      </Sheet>

      <main className="flex-1 flex flex-col min-w-0">
        {/* Unverified Email Warning Banner (Requirement #3) */}
        {user && user.emailVerified === false && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 md:px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-300 font-sans">
            <div className="flex items-center gap-2">
              <MailWarning className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <span>Please verify your email address to unlock full report mailing features.</span>
            </div>
            <button
              onClick={() => setShowVerificationModal(true)}
              className="px-3 py-1 bg-amber-500 text-black font-mono font-bold text-xs rounded-md hover:bg-amber-400 transition-colors shadow-sm shrink-0"
            >
              Verify Email
            </button>
          </div>
        )}

        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 md:px-6 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="text-base md:text-lg font-bold text-foreground truncate">{meta.title}</h2>
            <p className="text-xs text-muted-foreground font-mono truncate hidden sm:block">{meta.subtitle}</p>
          </div>
          {datasetLabel && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/40 border border-border">
              <Database className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-mono text-muted-foreground">{datasetLabel}</span>
            </div>
          )}

          {/* Website Notifications Bell 🔔 (Requirement #7 & #8) */}
          <NotificationsDropdown />

          {/* Theme Toggle Button ☀️🌙 */}
          <ThemeToggle />

          {activeTab !== 'data' && (
            <Button
              variant={uploadedForecast ? 'outline' : 'default'}
              size="sm"
              className="gap-1.5"
              onClick={goToUpload}
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{uploadedForecast ? 'New upload' : 'Upload data'}</span>
            </Button>
          )}
        </header>

        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          {activeTab === 'overview' && (
            <>
              {kpis ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4 mb-6">
                    <StatCard label="Volume" value={kpis.totalRevenue} icon={Package} delay={0} />
                    <StatCard label="Avg Price" value={kpis.avgPrice} icon={DollarSign} delay={0.05} />
                    <StatCard label="Accuracy" value={kpis.avgAccuracy} icon={Target} delay={0.1} />
                    <StatCard label="Products" value={String(kpis.productsTracked)} icon={Package} delay={0.15} />
                    <StatCard label="Alerts" value={String(kpis.alertsActive)} icon={AlertTriangle} delay={0.2} />
                    <StatCard label="Horizon" value={kpis.forecastHorizon} icon={Clock} delay={0.25} />
                    <StatCard label="Avg R²" value={kpis.modelVersion} icon={GitBranch} delay={0.3} />
                  </div>

                  <div className="mb-6">
                    <ErrorBoundary><BoardReportGenerator /></ErrorBoundary>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 mb-6">
                    <ErrorBoundary><UploadedForecastChart /></ErrorBoundary>
                    <ErrorBoundary><ModelComparison /></ErrorBoundary>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <ErrorBoundary><SeasonalTrends /></ErrorBoundary>
                    <ErrorBoundary><InventoryAlerts /></ErrorBoundary>
                  </div>
                  <div className="mt-6">
                    <ErrorBoundary><RecentActivityTimeline /></ErrorBoundary>
                  </div>
                </>
              ) : (
                <EmptyForecastState
                  title={selectedDatasetId ? "No forecast exists for this dataset" : "No data uploaded yet"}
                  hint={selectedDatasetId ? "This dataset has not been trained yet. Click Train & Forecast to build XGBoost + LSTM models for this dataset." : "Drop a CSV with date, product and sales columns. We'll train a hybrid XGBoost–LSTM model and unlock every dashboard tab."}
                  buttonText={selectedDatasetId ? "Train & Forecast Dataset" : "Upload data"}
                  onUploadClick={selectedDatasetId ? () => loadDatasetForTraining(selectedDatasetId) : goToUpload}
                />
              )}
            </>
          )}

          {activeTab === 'forecast' && (
            <div className="max-w-6xl">
              <ErrorBoundary>
                {uploadedForecast
                  ? <UploadedForecastChart />
                  : <EmptyForecastState
                      title={selectedDatasetId ? "No forecast exists for this dataset" : "No forecast available"}
                      hint={selectedDatasetId ? "This dataset has not been trained yet. Click Train & Forecast to generate projections." : "Upload data to see per-product forecasts."}
                      buttonText={selectedDatasetId ? "Train & Forecast Dataset" : "Upload data"}
                      onUploadClick={selectedDatasetId ? () => loadDatasetForTraining(selectedDatasetId) : goToUpload}
                    />}
              </ErrorBoundary>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="max-w-6xl">
              <ErrorBoundary>
                {uploadedForecast
                  ? <ModelComparison />
                  : <EmptyForecastState
                      title={selectedDatasetId ? "No model trained for this dataset" : "No model trained yet"}
                      hint={selectedDatasetId ? "Train this dataset to compare XGBoost, LSTM and hybrid accuracy." : "Upload data to compare XGBoost, LSTM and hybrid accuracy."}
                      buttonText={selectedDatasetId ? "Train & Forecast Dataset" : "Upload data"}
                      onUploadClick={selectedDatasetId ? () => loadDatasetForTraining(selectedDatasetId) : goToUpload}
                    />}
              </ErrorBoundary>
            </div>
          )}

          {activeTab === 'accuracy' && (
            <div className="max-w-6xl">
              <ErrorBoundary>
                {uploadedForecast
                  ? <ForecastAccuracyReport />
                  : <EmptyForecastState
                      title={selectedDatasetId ? "No accuracy data for this dataset" : "No accuracy data"}
                      hint={selectedDatasetId ? "Train this dataset to see per-product accuracy reports." : "Upload data and run a forecast to see per-product accuracy reports."}
                      buttonText={selectedDatasetId ? "Train & Forecast Dataset" : "Upload data"}
                      onUploadClick={selectedDatasetId ? () => loadDatasetForTraining(selectedDatasetId) : goToUpload}
                    />}
              </ErrorBoundary>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="max-w-5xl">
              <ErrorBoundary>
                {uploadedForecast
                  ? <InventoryManagement />
                  : <EmptyForecastState
                      title={selectedDatasetId ? "No inventory data for this dataset" : "No inventory recommendations"}
                      hint={selectedDatasetId ? "Train this dataset to compute ROP, EOQ and safety stock." : "Upload data to compute ROP, EOQ and safety stock."}
                      buttonText={selectedDatasetId ? "Train & Forecast Dataset" : "Upload data"}
                      onUploadClick={selectedDatasetId ? () => loadDatasetForTraining(selectedDatasetId) : goToUpload}
                    />}
              </ErrorBoundary>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="max-w-6xl">
              <ErrorBoundary>
                {uploadedForecast
                  ? <DynamicPricing />
                  : <EmptyForecastState
                      title={selectedDatasetId ? "No pricing data for this dataset" : "No pricing data"}
                      hint={selectedDatasetId ? "Train this dataset to model price elasticity and revenue." : "Upload data to model price elasticity and revenue."}
                      buttonText={selectedDatasetId ? "Train & Forecast Dataset" : "Upload data"}
                      onUploadClick={selectedDatasetId ? () => loadDatasetForTraining(selectedDatasetId) : goToUpload}
                    />}
              </ErrorBoundary>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="max-w-6xl">
              <ErrorBoundary>
                <ReportsView />
              </ErrorBoundary>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="max-w-5xl">
              <ErrorBoundary>
                <DataUpload
                  initialCsvData={loadedDataset?.csvData}
                  initialMapping={loadedDataset?.mapping}
                  initialFileName={loadedDataset?.name}
                  initialDatasetId={loadedDataset?.id || selectedDatasetId}
                />
              </ErrorBoundary>
            </div>
          )}

          {activeTab === 'datasets' && (
            <div className="max-w-5xl">
              <ErrorBoundary>
                <MyDatasets 
                  onUseForForecast={(csvData, mapping, name, id) => {
                    setLoadedDataset({ csvData, mapping, name, id });
                    handleTabChange('data', id);
                  }} 
                  onLoadForecast={(datasetId) => handleTabChange('forecast', datasetId)}
                />
              </ErrorBoundary>
            </div>
          )}

          {activeTab === 'combine' && (
            <div className="max-w-5xl">
              <ErrorBoundary>
                <CombineDatasets onUseForForecast={(csvData, mapping, name) => {
                  setLoadedDataset({ csvData, mapping, name });
                  handleTabChange('data');
                }} />
              </ErrorBoundary>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-5xl">
              <ErrorBoundary>
                <Profile onVerifyClick={() => setShowVerificationModal(true)} />
              </ErrorBoundary>
            </div>
          )}
        </div>
      </main>
      <GenAIAssistant />
    </div>
  );
};

export default Index;
