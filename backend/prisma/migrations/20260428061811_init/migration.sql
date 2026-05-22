-- CreateEnum
CREATE TYPE "public"."ReportStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."PatternCategory" AS ENUM ('MISLEADING', 'OBSTRUCTING', 'PRESSURING', 'EXPLOITING');

-- CreateEnum
CREATE TYPE "public"."RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."DetectedBy" AS ENUM ('RULE', 'MODEL', 'LLM', 'HYBRID');

-- CreateTable
CREATE TABLE "public"."reports" (
    "id" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "status" "public"."ReportStatus" NOT NULL DEFAULT 'PROCESSING',
    "overall_risk_score" INTEGER NOT NULL DEFAULT 0,
    "total_detected" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "analyzed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_images" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "page_label" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ocr_results" (
    "id" TEXT NOT NULL,
    "image_id" TEXT NOT NULL,
    "full_text" TEXT,
    "lines_json" JSONB,
    "boxes_json" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocr_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."detected_patterns" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "image_id" TEXT,
    "category" "public"."PatternCategory" NOT NULL,
    "pattern_type_id" INTEGER NOT NULL,
    "pattern_name" TEXT NOT NULL,
    "risk_level" "public"."RiskLevel" NOT NULL,
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "recommendation" TEXT,
    "location" TEXT,
    "evidence_text" TEXT,
    "evidence_boxes_json" JSONB,
    "detected_by" "public"."DetectedBy" NOT NULL DEFAULT 'RULE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detected_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ocr_results_image_id_key" ON "public"."ocr_results"("image_id");

-- AddForeignKey
ALTER TABLE "public"."report_images" ADD CONSTRAINT "report_images_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ocr_results" ADD CONSTRAINT "ocr_results_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "public"."report_images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."detected_patterns" ADD CONSTRAINT "detected_patterns_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."detected_patterns" ADD CONSTRAINT "detected_patterns_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "public"."report_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;
