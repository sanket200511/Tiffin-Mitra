import { db, customerSubscriptionsTable, vendorsTable, ordersTable, walletTransactionsTable, customersTable, vendorHolidaysTable, subscriptionPlansTable } from "@workspace/db";
import { eq, and, inArray, ne } from "drizzle-orm";
import { notifyUser } from "./notify";

export async function resumeSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const [existing] = await db.select({
      sub: customerSubscriptionsTable,
      vendor: vendorsTable,
      plan: subscriptionPlansTable,
      customer: customersTable,
    })
      .from(customerSubscriptionsTable)
      .leftJoin(vendorsTable, eq(customerSubscriptionsTable.vendorId, vendorsTable.id))
      .leftJoin(subscriptionPlansTable, eq(customerSubscriptionsTable.planId, subscriptionPlansTable.id))
      .leftJoin(customersTable, eq(customerSubscriptionsTable.customerId, customersTable.id))
      .where(eq(customerSubscriptionsTable.id, subscriptionId));

    if (!existing || !existing.sub || !existing.plan || !existing.customer) {
      return { success: false, error: "Subscription or related data not found" };
    }

    const { sub, vendor, plan, customer } = existing;

    if (sub.status !== "paused") {
      return { success: false, error: "Subscription is not paused" };
    }

    const today = new Date();
    const endDt = new Date(sub.endDate);
    if (today > endDt) {
      return { success: false, error: "Subscription has already reached its end date" };
    }

    const now = new Date();
    const cutoffHour = vendor?.pauseCutoffHour ?? 20;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    let actualResumeStartDate: string;
    const isAfterCutoff = now.getHours() >= cutoffHour;
    if (isAfterCutoff) {
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
      actualResumeStartDate = dayAfterTomorrow.toISOString().split("T")[0];
    } else {
      actualResumeStartDate = tomorrowStr;
    }

    const endDate = new Date(sub.endDate);
    const resumeStart = new Date(actualResumeStartDate);

    if (resumeStart > endDate) {
      return { success: false, error: "No remaining delivery days to resume" };
    }

    // Find delivery dates
    const deliveryDates: string[] = [];
    let cursor = new Date(resumeStart);
    const isWeekdayPlan = plan.planType === "weekday";

    while (cursor <= endDate) {
      const day = cursor.getDay();
      if (!isWeekdayPlan || (day !== 0 && day !== 6)) {
        deliveryDates.push(cursor.toISOString().split("T")[0]);
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    if (deliveryDates.length === 0) {
      return { success: false, error: "No delivery days found in the remaining period" };
    }

    // Check for vendor holidays
    const holidayRows = await db.select({ date: vendorHolidaysTable.date })
      .from(vendorHolidaysTable)
      .where(and(
        eq(vendorHolidaysTable.vendorId, sub.vendorId),
        inArray(vendorHolidaysTable.date, deliveryDates)
      ));
    const holidaySet = new Set(holidayRows.map(h => h.date));
    const finalDeliveryDates = deliveryDates.filter(d => !holidaySet.has(d));

    if (finalDeliveryDates.length === 0) {
      return { success: false, error: "All remaining days are vendor holidays" };
    }

    // Check if any orders ALREADY exist for these dates
    const existingOrders = await db.select().from(ordersTable)
      .where(and(
        eq(ordersTable.subscriptionId, sub.id),
        inArray(ordersTable.scheduledDate, finalDeliveryDates),
        ne(ordersTable.status, "cancelled")
      ));
    const existingDates = new Set(existingOrders.map(o => o.scheduledDate));
    const datesToCreate = finalDeliveryDates.filter(d => !existingDates.has(d));

    if (datesToCreate.length > 0) {
      const pricePerOrder = parseFloat(plan.price as string) / (isWeekdayPlan ? 22 : 30);
      const totalResumeCharge = pricePerOrder * datesToCreate.length;
      const currentBalance = parseFloat(customer.walletBalance as string ?? "0");

      if (currentBalance < totalResumeCharge) {
        return { success: false, error: `Insufficient balance (Need ₹${totalResumeCharge.toFixed(2)})` };
      }

      // Debit wallet
      await db.update(customersTable)
        .set({ walletBalance: (currentBalance - totalResumeCharge).toFixed(2), updatedAt: new Date() })
        .where(eq(customersTable.id, customer.id));

      await db.insert(walletTransactionsTable).values({
        customerId: customer.id,
        type: "debit",
        amount: totalResumeCharge.toFixed(2),
        description: `Subscription Resume: ${plan.name} from ${vendor?.name} (${datesToCreate.length} meals re-scheduled)`,
      });

      // Create orders
      const primaryMealType = (plan as any).mealTypes?.[0] || null;
      const ordersToInsert = datesToCreate.map(date => ({
        customerId: customer.id,
        vendorId: sub.vendorId,
        subscriptionId: sub.id,
        scheduledDate: date,
        mealType: primaryMealType,
        totalAmount: pricePerOrder.toFixed(2),
        deliveryAddress: sub.deliveryAddress,
        status: "pending" as const,
      }));

      await db.insert(ordersTable).values(ordersToInsert);
    }

    // Finally, update the status
    await db.update(customerSubscriptionsTable)
      .set({ status: "active", pausedUntil: null, updatedAt: new Date() })
      .where(eq(customerSubscriptionsTable.id, subscriptionId));

    await notifyUser(customer.userId, {
      type: "subscription_resumed",
      title: "Subscription Resumed!",
      body: `Your subscription for ${plan.name} has been resumed.`,
    });

    return { success: true };
  } catch (err) {
    console.error("Failed to resume subscription:", err);
    return { success: false, error: "Internal server error" };
  }
}
