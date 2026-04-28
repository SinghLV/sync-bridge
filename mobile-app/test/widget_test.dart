import 'package:flutter_test/flutter_test.dart';

import 'package:sync_bridge_mobile/main.dart';

void main() {
  testWidgets('selection screen renders sync bridge shell', (WidgetTester tester) async {
    await tester.pumpWidget(const SyncBridgeApp());

    expect(find.text('SYNC_BRIDGE'), findsOneWidget);
    expect(find.text('BEACON_MODE'), findsOneWidget);
    expect(find.text('COMMAND_GRID'), findsOneWidget);
  });
}
