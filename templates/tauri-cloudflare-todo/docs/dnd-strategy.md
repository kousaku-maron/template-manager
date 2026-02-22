# Drag and Drop Strategy (dnd-kit)

このドキュメントは `tauri-cloudflare-todo` のボード画面における、dnd-kit を使ったドラッグドロップ戦略の現状整理です。

## 目的

- 同一ステータス内の並び替えを直感どおりに動かす
- ステータス横断移動で挿入位置のプレビューと確定結果を一致させる
- ドロップ先の判定ブレを減らす
- バックエンド更新は必要最小限の差分だけ送る

## 主要コンポーネント

- `app/src/routes/BoardRoute.tsx`
  - DnDイベント (`onDragStart` / `onDragOver` / `onDragCancel` / `onDragEnd`)
  - 衝突判定戦略 (`collisionDetectionStrategy`)
  - プレビュー投影 (`projectCardsForDrag`)
- `app/src/components/SortableCard.tsx`
  - `useSortable({ id: card.id })`
- `app/src/components/DroppableColumn.tsx`
  - `useDroppable({ id: status })`
- `backend/src/index.ts` (`POST /api/reorder`)
  - 並び順の一括更新

## 状態モデル

- 永続状態: `cards`
  - サーバー同期対象
- ドラッグ中プレビュー: `dragPreviewCards`
  - `onDragOver` でのみ更新
  - ドロップ確定・キャンセルで破棄
- 補助状態:
  - `activeCard`: DragOverlay 表示用
  - `dragSourceStatusRef`: ドラッグ開始時の元ステータス
  - `lastOverIdRef`: 一時的に衝突が取れない瞬間のフォールバック

## 衝突判定戦略 (Multi-container)

`collisionDetectionStrategy` は次の優先順で判定する:

1. `pointerWithin`
2. ヒットしなければ `rectIntersection`
3. カラム自体にヒットした場合:
   - そのカラム配下カードだけに絞って `closestCenter`
   - 具体的なカード ID を採用
4. それでも取れない場合:
   - `lastOverIdRef` を返してターゲット飛びを抑える

これにより、カラム境界やカード間の判定ブレを抑える。

## 投影ロジックの統一

`projectCardsForDrag(baseCards, activeId, overId, isBelowOverItem)` を単一の真実として使う。

- `onDragOver`:
  - `baseCards = dragPreviewCards ?? cards`
  - `projectCardsForDrag` の結果を `dragPreviewCards` に反映
- `onDragEnd`:
  - 同じ `projectCardsForDrag` を使って最終状態を確定
  - プレビューと確定のロジック差分をなくす

## 同一カラム移動

- 同一カラムかつ `overId` がカード ID の場合は `arrayMove` を使用
- これにより「上から下に移動すると 1つ上に入る」ようなオフバイワンを回避

## ステータス横断移動

- 挿入先カラムの並びを再計算
- 元カラムの `sortOrder` を詰め直す
- `isBelowOverItem` (ポインタ位置) に応じて、overカードの前/後に挿入

## サーバー更新 (`POST /api/reorder`)

`onDragEnd` では変更があったステータス列のみ `items` を作り、以下を送る:

- `id`
- `status`
- `sortOrder`

バックエンド側は `WITH input ... UPDATE ... FROM input ... RETURNING` で一括更新する。

## ガード条件

- `onDragCancel`:
  - `dragPreviewCards`, `activeCard`, ref をクリア
- 変更なし判定:
  - 送信前に `status/sortOrder` の差分がなければ API を呼ばない

## 変更時の注意点

- `onDragOver` と `onDragEnd` で別アルゴリズムを持たない
- 衝突判定戦略と投影ロジックはセットで調整する
- 並び替えの不具合切り分けは、まずフロント投影を疑う
  - SQL側は受け取った `items` を反映する責務に限定する

## 動作確認チェックリスト

- 同一カラム:
  - 上→下, 下→上で期待順序になる
- ステータス横断:
  - プレビュー位置とドロップ後確定位置が一致する
- カラム境界:
  - カラム上端/下端/空カラムへのドロップが安定する
- 失敗時:
  - API失敗でローカル状態がサーバー状態に戻る
