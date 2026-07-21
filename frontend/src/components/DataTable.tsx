import { Table as AntTable, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
}

const { Text } = Typography;

export default function DataTable<T extends object>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  // Transform our Column interface to AntD ColumnsType
  const antColumns: ColumnsType<T> = columns.map((col) => ({
    title: (
      <Text
        strong
        style={{
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#4A5568',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        {col.header}
      </Text>
    ),
    dataIndex: col.key,
    key: col.key,
    render: (_: unknown, record: T) => col.render(record),
  }));

  // Transform data to include key for AntD
  const dataSource = data.map((item) => ({
    ...item,
    key: keyExtractor(item),
  }));

  return (
    <AntTable<T>
      columns={antColumns}
      dataSource={dataSource}
      pagination={false}
      size="middle"
      locale={{
        emptyText: (
          <div
            style={{
              padding: '32px',
              textAlign: 'center',
            }}
          >
            <Text type="secondary">{emptyMessage}</Text>
          </div>
        ),
      }}
      style={{
        borderRadius: 24,
        overflow: 'hidden',
      }}
    />
  );
}
