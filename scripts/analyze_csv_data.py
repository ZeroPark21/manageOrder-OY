import pandas as pd
import requests
from io import StringIO

# CSV 파일 다운로드 및 분석
url = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/All%20order-2025-07-20-22_38-FiFZwQ7Frww1QxloYkJF3HMKUPLfWk.csv"

print("📥 Downloading CSV file...")
response = requests.get(url)
csv_content = response.text

print("📊 Loading data into DataFrame...")
df = pd.read_csv(StringIO(csv_content))

print(f"📈 Dataset Info:")
print(f"- Total rows: {len(df)}")
print(f"- Total columns: {len(df.columns)}")
print(f"- Memory usage: {df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB")

print(f"\n📋 Column Names and Types:")
for i, col in enumerate(df.columns):
    print(f"{i+1:2d}. {col:<35} | {str(df[col].dtype):<10} | Non-null: {df[col].count()}")

print(f"\n🎯 Key Statistics:")
print(f"- Unique Order IDs: {df['Order ID'].nunique()}")
print(f"- Unique Products: {df['Product Name'].nunique()}")
print(f"- Total Quantity: {df['Quantity'].sum()}")
print(f"- Date range: {df['Created Time'].min()} to {df['Created Time'].max()}")

print(f"\n📦 Product Analysis:")
product_stats = df.groupby('Product Name').agg({
    'Quantity': 'sum',
    'Order ID': 'count'
}).sort_values('Quantity', ascending=False)

print("Top 10 products by quantity:")
for i, (product, stats) in enumerate(product_stats.head(10).iterrows()):
    print(f"{i+1:2d}. {product[:50]:<50} | Qty: {stats['Quantity']:3d} | Orders: {stats['Order ID']:3d}")

print(f"\n📅 Date Analysis:")
df['Created Time'] = pd.to_datetime(df['Created Time'])
df['Date'] = df['Created Time'].dt.date

daily_stats = df.groupby('Date').agg({
    'Quantity': 'sum',
    'Order ID': 'count'
}).sort_values('Date')

print("Daily totals:")
for date, stats in daily_stats.iterrows():
    print(f"{date} | Qty: {stats['Quantity']:3d} | Orders: {stats['Order ID']:3d}")

print(f"\n🔍 Data Quality Check:")
print(f"- Missing Order IDs: {df['Order ID'].isnull().sum()}")
print(f"- Missing Product Names: {df['Product Name'].isnull().sum()}")
print(f"- Missing Quantities: {df['Quantity'].isnull().sum()}")
print(f"- Missing Created Time: {df['Created Time'].isnull().sum()}")

print(f"\n💰 Order Amount Analysis:")
print(f"- Order Amount column type: {df['Order Amount'].dtype}")
print(f"- Sample Order Amount values: {df['Order Amount'].head().tolist()}")
print(f"- Non-null Order Amounts: {df['Order Amount'].count()}")

print(f"\n📊 Order Status Distribution:")
status_counts = df['Order Status'].value_counts()
for status, count in status_counts.items():
    print(f"- {status}: {count}")

print(f"\n🏷️ Sample Data (first 3 rows):")
sample_cols = ['Order ID', 'Product Name', 'Quantity', 'Created Time', 'Order Amount', 'Order Status']
print(df[sample_cols].head(3).to_string())
