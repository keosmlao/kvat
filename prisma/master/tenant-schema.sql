--
-- PostgreSQL database dump
--


-- Dumped from database version 17.8 (Homebrew)
-- Dumped by pg_dump version 17.8 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: InvoiceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InvoiceStatus" AS ENUM (
    'DRAFT',
    'ISSUED',
    'CANCELLED'
);


--
-- Name: MessageKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MessageKind" AS ENUM (
    'COMMENT',
    'NOTE',
    'LOG'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'UNPAID',
    'PARTIAL',
    'PAID'
);


--
-- Name: StockMovementType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StockMovementType" AS ENUM (
    'IN',
    'OUT',
    'ADJUST'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'STAFF'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Activity" (
    id text NOT NULL,
    summary text NOT NULL,
    note text,
    "dueDate" timestamp(3) without time zone NOT NULL,
    done boolean DEFAULT false NOT NULL,
    "doneAt" timestamp(3) without time zone,
    "recordType" text NOT NULL,
    "recordId" text NOT NULL,
    "assignedToId" text NOT NULL,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Category" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Customer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Customer" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "imageUrl" text,
    "taxId" text,
    phone text,
    email text,
    address text,
    "provinceId" text,
    "districtId" text,
    "villageId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: District; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."District" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "nameEn" text,
    "provinceId" text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Follower; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Follower" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "recordType" text NOT NULL,
    "recordId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Invoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Invoice" (
    id text NOT NULL,
    number text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "customerId" text NOT NULL,
    "userId" text NOT NULL,
    currency text DEFAULT 'LAK'::text NOT NULL,
    "exchangeRate" double precision DEFAULT 1 NOT NULL,
    subtotal double precision NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    "vatRate" double precision DEFAULT 0.1 NOT NULL,
    "vatMode" text DEFAULT 'EXCLUSIVE'::text NOT NULL,
    "vatAmount" double precision NOT NULL,
    total double precision NOT NULL,
    status public."InvoiceStatus" DEFAULT 'ISSUED'::public."InvoiceStatus" NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "dueDate" timestamp(3) without time zone,
    "isCreditNote" boolean DEFAULT false NOT NULL,
    "paidAmount" double precision DEFAULT 0 NOT NULL,
    "paymentStatus" public."PaymentStatus" DEFAULT 'UNPAID'::public."PaymentStatus" NOT NULL,
    "paymentTermId" text,
    "reversedId" text,
    "paymentMethod" text DEFAULT 'CASH'::text NOT NULL,
    "paymentRef" text,
    "etaxCheckCode" text,
    "etaxErrorCode" text,
    "etaxErrorMsg" text,
    "etaxInvoiceNumber" text,
    "etaxIssueTime" text,
    "etaxLastCheckedAt" timestamp(3) without time zone,
    "etaxQrUrl" text,
    "etaxSerialNum" text,
    "etaxStatus" text,
    "etaxStatusReason" text,
    "etaxSubmittedAt" timestamp(3) without time zone
);


--
-- Name: InvoiceItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InvoiceItem" (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "productId" text NOT NULL,
    "productName" text NOT NULL,
    unit text NOT NULL,
    quantity double precision NOT NULL,
    "priceLak" double precision NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    total double precision NOT NULL
);


--
-- Name: Message; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Message" (
    id text NOT NULL,
    body text NOT NULL,
    kind public."MessageKind" DEFAULT 'COMMENT'::public."MessageKind" NOT NULL,
    "recordType" text NOT NULL,
    "recordId" text NOT NULL,
    "authorId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    number text NOT NULL,
    "invoiceId" text NOT NULL,
    amount double precision NOT NULL,
    method text DEFAULT 'CASH'::text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reference text,
    note text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PaymentTerm; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PaymentTerm" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    days integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    "imageUrl" text,
    unit text DEFAULT 'ອັນ'::text NOT NULL,
    "unitId" text,
    "categoryId" text,
    "typeId" text,
    "warehouseId" text,
    "costingMethod" text DEFAULT 'STANDARD'::text NOT NULL,
    "priceLak" double precision NOT NULL,
    "costLak" double precision DEFAULT 0 NOT NULL,
    stock double precision DEFAULT 0 NOT NULL,
    "minStock" double precision DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProductType; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductType" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "trackStock" boolean DEFAULT true NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Province; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Province" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "nameEn" text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Setting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Setting" (
    id text DEFAULT 'default'::text NOT NULL,
    "shopName" text DEFAULT 'ຮ້ານຄ້າ'::text NOT NULL,
    "shopNameEn" text,
    "taxId" text,
    address text,
    phone text,
    email text,
    "logoUrl" text,
    "vatRate" double precision DEFAULT 0.1 NOT NULL,
    "defaultCurrency" text DEFAULT 'LAK'::text NOT NULL,
    "invoicePrefix" text DEFAULT 'INV'::text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "enableChatter" boolean DEFAULT true NOT NULL,
    "enableCreditNotes" boolean DEFAULT true NOT NULL,
    "enableDashboard" boolean DEFAULT true NOT NULL,
    "enablePos" boolean DEFAULT false NOT NULL,
    "enableReports" boolean DEFAULT true NOT NULL,
    "etaxAutoSubmit" boolean DEFAULT false NOT NULL,
    "etaxEnv" text,
    "etaxIssueCode" text,
    "etaxSecret" text,
    "etaxUsername" text
);


--
-- Name: StockMovement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockMovement" (
    id text NOT NULL,
    "productId" text NOT NULL,
    type public."StockMovementType" NOT NULL,
    quantity double precision NOT NULL,
    reference text,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Unit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Unit" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    role public."UserRole" DEFAULT 'STAFF'::public."UserRole" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Village; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Village" (
    id text NOT NULL,
    code text,
    name text NOT NULL,
    "nameEn" text,
    "districtId" text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Warehouse; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Warehouse" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    address text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Activity Activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Activity"
    ADD CONSTRAINT "Activity_pkey" PRIMARY KEY (id);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- Name: Customer Customer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_pkey" PRIMARY KEY (id);


--
-- Name: District District_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."District"
    ADD CONSTRAINT "District_pkey" PRIMARY KEY (id);


--
-- Name: Follower Follower_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Follower"
    ADD CONSTRAINT "Follower_pkey" PRIMARY KEY (id);


--
-- Name: InvoiceItem InvoiceItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoiceItem"
    ADD CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY (id);


--
-- Name: Invoice Invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);


--
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);


--
-- Name: PaymentTerm PaymentTerm_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PaymentTerm"
    ADD CONSTRAINT "PaymentTerm_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: ProductType ProductType_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductType"
    ADD CONSTRAINT "ProductType_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: Province Province_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Province"
    ADD CONSTRAINT "Province_pkey" PRIMARY KEY (id);


--
-- Name: Setting Setting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Setting"
    ADD CONSTRAINT "Setting_pkey" PRIMARY KEY (id);


--
-- Name: StockMovement StockMovement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_pkey" PRIMARY KEY (id);


--
-- Name: Unit Unit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Unit"
    ADD CONSTRAINT "Unit_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Village Village_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Village"
    ADD CONSTRAINT "Village_pkey" PRIMARY KEY (id);


--
-- Name: Warehouse Warehouse_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Warehouse"
    ADD CONSTRAINT "Warehouse_pkey" PRIMARY KEY (id);


--
-- Name: Activity_assignedToId_done_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Activity_assignedToId_done_idx" ON public."Activity" USING btree ("assignedToId", done);


--
-- Name: Activity_recordType_recordId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Activity_recordType_recordId_idx" ON public."Activity" USING btree ("recordType", "recordId");


--
-- Name: Category_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Category_code_key" ON public."Category" USING btree (code);


--
-- Name: Customer_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Customer_code_key" ON public."Customer" USING btree (code);


--
-- Name: Customer_districtId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Customer_districtId_idx" ON public."Customer" USING btree ("districtId");


--
-- Name: Customer_provinceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Customer_provinceId_idx" ON public."Customer" USING btree ("provinceId");


--
-- Name: Customer_villageId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Customer_villageId_idx" ON public."Customer" USING btree ("villageId");


--
-- Name: District_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "District_code_key" ON public."District" USING btree (code);


--
-- Name: District_provinceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "District_provinceId_idx" ON public."District" USING btree ("provinceId");


--
-- Name: Follower_recordType_recordId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Follower_recordType_recordId_idx" ON public."Follower" USING btree ("recordType", "recordId");


--
-- Name: Follower_userId_recordType_recordId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Follower_userId_recordType_recordId_key" ON public."Follower" USING btree ("userId", "recordType", "recordId");


--
-- Name: InvoiceItem_invoiceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InvoiceItem_invoiceId_idx" ON public."InvoiceItem" USING btree ("invoiceId");


--
-- Name: Invoice_customerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invoice_customerId_idx" ON public."Invoice" USING btree ("customerId");


--
-- Name: Invoice_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invoice_date_idx" ON public."Invoice" USING btree (date);


--
-- Name: Invoice_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Invoice_number_key" ON public."Invoice" USING btree (number);


--
-- Name: Invoice_paymentStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Invoice_paymentStatus_idx" ON public."Invoice" USING btree ("paymentStatus");


--
-- Name: Message_recordType_recordId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Message_recordType_recordId_createdAt_idx" ON public."Message" USING btree ("recordType", "recordId", "createdAt");


--
-- Name: PaymentTerm_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PaymentTerm_code_key" ON public."PaymentTerm" USING btree (code);


--
-- Name: Payment_invoiceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Payment_invoiceId_idx" ON public."Payment" USING btree ("invoiceId");


--
-- Name: Payment_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Payment_number_key" ON public."Payment" USING btree (number);


--
-- Name: ProductType_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductType_code_key" ON public."ProductType" USING btree (code);


--
-- Name: Product_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_categoryId_idx" ON public."Product" USING btree ("categoryId");


--
-- Name: Product_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Product_code_key" ON public."Product" USING btree (code);


--
-- Name: Product_typeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_typeId_idx" ON public."Product" USING btree ("typeId");


--
-- Name: Product_warehouseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Product_warehouseId_idx" ON public."Product" USING btree ("warehouseId");


--
-- Name: Province_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Province_code_key" ON public."Province" USING btree (code);


--
-- Name: StockMovement_productId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockMovement_productId_idx" ON public."StockMovement" USING btree ("productId");


--
-- Name: Unit_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Unit_code_key" ON public."Unit" USING btree (code);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Village_districtId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Village_districtId_idx" ON public."Village" USING btree ("districtId");


--
-- Name: Warehouse_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Warehouse_code_key" ON public."Warehouse" USING btree (code);


--
-- Name: Activity Activity_assignedToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Activity"
    ADD CONSTRAINT "Activity_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Activity Activity_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Activity"
    ADD CONSTRAINT "Activity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Customer Customer_districtId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES public."District"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Customer Customer_provinceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES public."Province"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Customer Customer_villageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_villageId_fkey" FOREIGN KEY ("villageId") REFERENCES public."Village"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: District District_provinceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."District"
    ADD CONSTRAINT "District_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES public."Province"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Follower Follower_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Follower"
    ADD CONSTRAINT "Follower_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InvoiceItem InvoiceItem_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoiceItem"
    ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InvoiceItem InvoiceItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InvoiceItem"
    ADD CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Invoice Invoice_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Invoice Invoice_paymentTermId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_paymentTermId_fkey" FOREIGN KEY ("paymentTermId") REFERENCES public."PaymentTerm"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Invoice Invoice_reversedId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_reversedId_fkey" FOREIGN KEY ("reversedId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Invoice Invoice_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Invoice"
    ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Message Message_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_invoiceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES public."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Payment Payment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Product Product_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Product Product_typeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES public."ProductType"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Product Product_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public."Unit"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Product Product_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public."Warehouse"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StockMovement StockMovement_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Village Village_districtId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Village"
    ADD CONSTRAINT "Village_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES public."District"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--


