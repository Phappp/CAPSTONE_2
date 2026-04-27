CREATE TABLE IF NOT EXISTS payment_orders (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  provider VARCHAR(40) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'VND',
  status ENUM('pending','paid','failed','expired','refunded') NOT NULL DEFAULT 'pending',
  provider_order_ref VARCHAR(100) NULL,
  provider_txn_ref VARCHAR(100) NULL,
  raw_return_payload JSON NULL,
  paid_at DATETIME NULL,
  expired_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY ux_payment_orders_provider_order_ref (provider_order_ref),
  KEY idx_payment_orders_user_course_status (user_id, course_id, status),
  CONSTRAINT fk_payment_orders_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_payment_orders_course FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE IF NOT EXISTS payment_events (
  id INT NOT NULL AUTO_INCREMENT,
  order_id INT NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  payload JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payment_events_order_id (order_id),
  CONSTRAINT fk_payment_events_order FOREIGN KEY (order_id) REFERENCES payment_orders(id)
);

