CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "category" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

INSERT INTO "products" ("id", "sku", "name", "description", "price", "currency", "category", "updated_at")
VALUES
    (gen_random_uuid(), 'sku-1', 'Demo Widget', 'Учебный товар — успешный заказ (inventory есть)', 10.00, 'USD', 'demo', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'sku-2', 'Second Product', 'Второй товар из seed inventory', 25.00, 'USD', 'demo', CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'sku-4', 'Reject Demo Item', 'Демо отмены заказа (inventory отклонит)', 15.00, 'USD', 'demo', CURRENT_TIMESTAMP);
