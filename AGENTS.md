# AGENTS.md

## Project overview

HakoDrawは、立体をさまざまな方向から描く練習を行うブラウザアプリです。紙または普段使用している描画ソフトとの併用を前提とします。

主な技術はReact、TypeScript、Vite、Three.jsです。

## Source of truth

実装前に、対象機能に対応する要件文書を確認してください。

- 全体要件：`docs/requirements.md`
- 接続練習：`docs/connection-practice.md`
- パース練習：`docs/perspective-practice.md`
- 全身素体：`docs/mannequin.md`
- デザイン方針：`docs/design-system.md`

要件文書と実装が食い違う場合は、黙って仕様を変更せず、食い違いを報告してください。

## Architecture

- `src/App.tsx`：練習モード選択と回転・接続練習の画面
- `src/PerspectivePractice.tsx`：パース練習
- `src/session.ts`：時間制限付きセッションの状態遷移
- `src/settings.ts`：設定、検証、ブラウザ保存
- `src/connections.ts`：接続練習の項目とパーツ配置
- `src/scene/target.ts`：練習対象のThree.jsオブジェクト生成
- `src/scene/renderer.ts`：カメラ、回転、描画
- `src/scene/mannequin.ts`：全身素体のパーツ定義

セッションの進行処理とThree.jsの描画処理を分離してください。新しい練習対象は、可能な限りデータ定義として追加してください。

## Working rules

- ユーザーの未コミット変更を保持してください。
- 関係のないファイルを変更しないでください。
- 既存の配色、操作名、画面構成を再利用してください。
- 設定の変更で、進行中の問題番号、残り時間、一時停止状態を失わないようにしてください。
- 新しい保存項目には既定値と不正値の補正を用意してください。
- 色だけに依存して状態や軸を表現しないでください。
- 医学的・教育的な効果を、根拠なく断定しないでください。

## Commands

WSLのログインシェルでNode.jsを利用します。

- 開発サーバー：`npm run dev`
- 単体テスト：`npm test`
- 本番ビルド：`npm run build`
- ブラウザテスト：`npm run test:e2e`

依存関係を変更していない場合、毎回`npm ci`を実行する必要はありません。

## Verification

変更内容に応じて、次を確認してください。

- ロジックや設定を変更した場合：関連する単体テスト
- TypeScriptや画面を変更した場合：`npm run build`
- 操作や画面遷移を変更した場合：関連するブラウザテスト
- 共通処理を変更した場合：全ブラウザテスト

画面変更では、少なくとも次のサイズで横方向にはみ出さないことを確認してください。

- 320×640
- 390×844
- 844×390
- 1280×900

Three.jsの表示は、ライトテーマとダークテーマ、面の不透明度0%と100%、対象の回転中と一時停止中を必要に応じて確認してください。

## Completion report

作業完了時は、次を簡潔に報告してください。

- 何が変わったか
- 利用者がどこから確認できるか
- 実行したテストと結果
- 残っている制限や未確認事項
