-- CreateEnum
CREATE TYPE "public"."ReportCategory" AS ENUM ('NORMAL', 'MISLEADING', 'OBSTRUCTING', 'PRESSURING', 'EXPLOITING');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."RiskLevel" ADD VALUE 'SAFE';
ALTER TYPE "public"."RiskLevel" ADD VALUE 'CRITICAL';

-- AlterTable
ALTER TABLE "public"."detected_patterns" ADD COLUMN     "rule_id" TEXT,
ADD COLUMN     "rule_label" TEXT;

-- AlterTable
ALTER TABLE "public"."ocr_results" ADD COLUMN     "raw_json" JSONB;

-- AlterTable
ALTER TABLE "public"."report_images" ADD COLUMN     "file_size" INTEGER,
ADD COLUMN     "mime_type" TEXT,
ALTER COLUMN "url" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."reports" ADD COLUMN     "analysis_ms" INTEGER,
ADD COLUMN     "analysis_started_at" TIMESTAMP(3),
ADD COLUMN     "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "overall_category" "public"."ReportCategory",
ADD COLUMN     "overall_risk_level" "public"."RiskLevel",
ADD COLUMN     "suggestions_json" JSONB;

-- CreateTable
CREATE TABLE "public"."pattern_types" (
    "id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."PatternCategory" NOT NULL,
    "description" TEXT,
    "fsc_guideline" TEXT,
    "detectable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pattern_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."feature_vectors" (
    "id" TEXT NOT NULL,
    "image_id" TEXT NOT NULL,
    "text_probs" JSONB NOT NULL,
    "image_probs" JSONB NOT NULL,
    "rule_scores" JSONB NOT NULL,
    "ocr_meta" JSONB NOT NULL,
    "layout_features" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_vectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pattern_evidences" (
    "id" TEXT NOT NULL,
    "pattern_id" TEXT NOT NULL,
    "image_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "pattern_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."model_experiments" (
    "id" TEXT NOT NULL,
    "ocr_engine" TEXT NOT NULL,
    "text_model" TEXT NOT NULL,
    "image_model" TEXT NOT NULL,
    "meta_clf" TEXT NOT NULL,
    "precision" DOUBLE PRECISION NOT NULL,
    "recall" DOUBLE PRECISION NOT NULL,
    "f1_score" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "dataset_size" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_experiments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pattern_types_code_key" ON "public"."pattern_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "feature_vectors_image_id_key" ON "public"."feature_vectors"("image_id");

-- CreateIndex
CREATE INDEX "pattern_evidences_pattern_id_idx" ON "public"."pattern_evidences"("pattern_id");

-- CreateIndex
CREATE INDEX "detected_patterns_report_id_idx" ON "public"."detected_patterns"("report_id");

-- CreateIndex
CREATE INDEX "detected_patterns_image_id_idx" ON "public"."detected_patterns"("image_id");

-- CreateIndex
CREATE INDEX "detected_patterns_category_idx" ON "public"."detected_patterns"("category");

-- CreateIndex
CREATE INDEX "detected_patterns_risk_level_idx" ON "public"."detected_patterns"("risk_level");

-- CreateIndex
CREATE INDEX "report_images_report_id_idx" ON "public"."report_images"("report_id");

-- AddForeignKey
ALTER TABLE "public"."feature_vectors" ADD CONSTRAINT "feature_vectors_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "public"."report_images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."detected_patterns" ADD CONSTRAINT "detected_patterns_pattern_type_id_fkey" FOREIGN KEY ("pattern_type_id") REFERENCES "public"."pattern_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pattern_evidences" ADD CONSTRAINT "pattern_evidences_pattern_id_fkey" FOREIGN KEY ("pattern_id") REFERENCES "public"."detected_patterns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pattern_evidences" ADD CONSTRAINT "pattern_evidences_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "public"."report_images"("id") ON DELETE CASCADE ON UPDATE CASCADE;
